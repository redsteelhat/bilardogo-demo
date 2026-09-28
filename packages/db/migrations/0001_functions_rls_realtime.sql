-- BilardoGo: kısıtlar, iş kuralı trigger'ları, realtime yayınları, RLS ve bakım işleri.
-- Bu dosya elle yazılmıştır (drizzle-kit --custom). Supabase'e özgü şemalar (auth, realtime, storage, cron)
-- yoksa ilgili bölümler atlanır; böylece aynı migration yerel Postgres'te de çalışır.

-- ─────────────────────────────────────────────────────────── Eklentiler ve arama indeksleri
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profiles_search_trgm_idx ON public.profiles USING gin ((coalesce(full_name, '') || ' ' || coalesce(username, '')) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS venues_name_trgm_idx ON public.venues USING gin (name gin_trgm_ops);
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Kontrol kısıtları
ALTER TABLE public.match_players ADD CONSTRAINT match_players_slot_check CHECK (slot IN (1, 2));
--> statement-breakpoint
ALTER TABLE public.match_results ADD CONSTRAINT match_results_winner_check CHECK (winner_slot IS NULL OR winner_slot IN (1, 2));
--> statement-breakpoint
ALTER TABLE public.match_results ADD CONSTRAINT match_results_scores_check CHECK (p1_score >= 0 AND p2_score >= 0);
--> statement-breakpoint
ALTER TABLE public.venue_products ADD CONSTRAINT venue_products_price_check CHECK (price >= 0 AND (stock IS NULL OR stock >= 0));
--> statement-breakpoint
ALTER TABLE public.order_items ADD CONSTRAINT order_items_qty_check CHECK (qty > 0 AND unit_price >= 0);
--> statement-breakpoint
ALTER TABLE public.venue_tables ADD CONSTRAINT venue_tables_games_check CHECK (cardinality(allowed_game_types) > 0);
--> statement-breakpoint
ALTER TABLE public.friendships ADD CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id);
--> statement-breakpoint
ALTER TABLE public.blocks ADD CONSTRAINT blocks_not_self CHECK (blocker_id <> blocked_id);
--> statement-breakpoint
ALTER TABLE public.ads ADD CONSTRAINT ads_window_check CHECK (ends_at > starts_at);
--> statement-breakpoint
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_subject_check CHECK (
  (subject_type = 'user' AND user_id IS NOT NULL AND business_id IS NULL)
  OR (subject_type = 'business' AND business_id IS NOT NULL AND user_id IS NULL)
);
--> statement-breakpoint
ALTER TABLE public.practice_sessions ADD CONSTRAINT practice_sessions_check CHECK (innings > 0 AND score >= 0 AND (high_run IS NULL OR high_run <= score));
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Realtime yayın yardımcısı
-- Supabase Realtime varsa realtime.send ile yayın yapar; yoksa (yerel test) sessizce geçer.
-- Yayın hatası asla yazma işlemini bozmaz. Yük yalnızca "değişti" sinyali taşır; istemci veriyi API'den çeker.
CREATE OR REPLACE FUNCTION public.bg_broadcast(p_topic text, p_event text, p_payload jsonb, p_private boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF to_regprocedure('realtime.send(jsonb, text, text, boolean)') IS NOT NULL THEN
    EXECUTE 'SELECT realtime.send($1, $2, $3, $4)' USING p_payload, p_event, p_topic, p_private;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bg_broadcast failed: %', SQLERRM;
END;
$$;
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Tek aktif maç kuralı
-- match_players.active, maç durumundan türetilir; kısmi unique indeks (match_players_user_active_key)
-- bir kullanıcının aynı anda yalnız 1 aktif maçta olmasını veritabanı seviyesinde garanti eder.
CREATE OR REPLACE FUNCTION public.bg_match_players_set_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  SELECT m.status IN ('accepted', 'waiting_opponent', 'in_progress') INTO NEW.active
  FROM public.matches m WHERE m.id = NEW.match_id;
  NEW.active := coalesce(NEW.active, false);
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER match_players_set_active
BEFORE INSERT ON public.match_players
FOR EACH ROW EXECUTE FUNCTION public.bg_match_players_set_active();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bg_matches_sync_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.match_players
       SET active = NEW.status IN ('accepted', 'waiting_opponent', 'in_progress')
     WHERE match_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER matches_sync_active
AFTER UPDATE OF status ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.bg_matches_sync_active();
--> statement-breakpoint

-- Masa, maçın salonuna ait olmalı ve oyun türüne izin vermeli
CREATE OR REPLACE FUNCTION public.bg_matches_check_table()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  t record;
BEGIN
  IF NEW.table_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.table_id IS NOT DISTINCT FROM OLD.table_id AND NEW.game_type = OLD.game_type THEN
    RETURN NEW;
  END IF;
  SELECT venue_id, allowed_game_types, is_active INTO t FROM public.venue_tables WHERE id = NEW.table_id;
  IF t.venue_id IS DISTINCT FROM NEW.venue_id THEN
    RAISE EXCEPTION 'Masa bu salona ait değil' USING ERRCODE = 'check_violation', CONSTRAINT = 'matches_table_venue';
  END IF;
  IF NOT (NEW.game_type = ANY (t.allowed_game_types)) THEN
    RAISE EXCEPTION 'Bu masada bu oyun türü oynanamaz' USING ERRCODE = 'check_violation', CONSTRAINT = 'matches_table_game';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER matches_check_table
BEFORE INSERT OR UPDATE OF table_id, game_type ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.bg_matches_check_table();
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Realtime trigger'ları
CREATE OR REPLACE FUNCTION public.bg_rt_presence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v uuid;
  c integer;
BEGIN
  FOR v IN SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.venue_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.venue_id END]) AS x WHERE x IS NOT NULL
  LOOP
    PERFORM public.bg_broadcast('venue:' || v, 'presence', jsonb_build_object('venue_id', v), false);
    SELECT city_plate INTO c FROM public.venues WHERE id = v;
    IF c IS NOT NULL THEN
      PERFORM public.bg_broadcast('city:' || c, 'presence', jsonb_build_object('venue_id', v), false);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER presence_rt AFTER INSERT OR UPDATE OR DELETE ON public.presence
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_presence();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bg_rt_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m_id uuid;
  v_id uuid;
  u uuid;
  st text;
BEGIN
  IF TG_TABLE_NAME = 'matches' THEN
    m_id := NEW.id; v_id := NEW.venue_id; st := NEW.status::text;
  ELSE
    m_id := coalesce(NEW.match_id, OLD.match_id);
    SELECT venue_id, status::text INTO v_id, st FROM public.matches WHERE id = m_id;
  END IF;
  PERFORM public.bg_broadcast('venue:' || v_id, 'match', jsonb_build_object('match_id', m_id, 'status', st), false);
  PERFORM public.bg_broadcast('venue:' || v_id || ':staff', 'match', jsonb_build_object('match_id', m_id, 'status', st), true);
  FOR u IN SELECT user_id FROM public.match_players WHERE match_id = m_id LOOP
    PERFORM public.bg_broadcast('user:' || u, 'match', jsonb_build_object('match_id', m_id, 'status', st), true);
  END LOOP;
  IF TG_TABLE_NAME = 'match_players' AND TG_OP = 'DELETE' THEN
    PERFORM public.bg_broadcast('user:' || OLD.user_id, 'match', jsonb_build_object('match_id', m_id, 'status', st), true);
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER matches_rt AFTER INSERT OR UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_match();
--> statement-breakpoint
CREATE TRIGGER match_players_rt AFTER INSERT OR DELETE ON public.match_players
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_match();
--> statement-breakpoint
CREATE TRIGGER match_results_rt AFTER INSERT OR UPDATE ON public.match_results
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_match();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bg_rt_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o_id uuid;
  v_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    o_id := coalesce(NEW.id, OLD.id); v_id := coalesce(NEW.venue_id, OLD.venue_id);
  ELSE
    o_id := coalesce(NEW.order_id, OLD.order_id);
    SELECT venue_id INTO v_id FROM public.orders WHERE id = o_id;
  END IF;
  PERFORM public.bg_broadcast('venue:' || v_id || ':staff', 'order', jsonb_build_object('order_id', o_id), true);
  PERFORM public.bg_broadcast('order:' || o_id, 'order', jsonb_build_object('order_id', o_id), true);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER orders_rt AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_order();
--> statement-breakpoint
CREATE TRIGGER order_items_rt AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_order();
--> statement-breakpoint
CREATE TRIGGER order_participants_rt AFTER INSERT OR DELETE ON public.order_participants
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_order();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bg_rt_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id AND TG_OP = 'INSERT';
  PERFORM public.bg_broadcast('conv:' || NEW.conversation_id, 'message',
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id, 'op', lower(TG_OP)), true);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER messages_rt AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_message();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bg_rt_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.bg_broadcast('user:' || NEW.user_id, 'notification', jsonb_build_object('id', NEW.id), true);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER notifications_rt AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_notification();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bg_rt_venue_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.bg_broadcast('venue:' || coalesce(NEW.venue_id, OLD.venue_id), 'tables', '{}'::jsonb, false);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER venue_tables_rt AFTER INSERT OR UPDATE OR DELETE ON public.venue_tables
FOR EACH ROW EXECUTE FUNCTION public.bg_rt_venue_tables();
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Yeni kullanıcı
-- auth.users'a kayıt düştüğünde profil, bildirim tercihi ve 30 günlük deneme aboneliği açılır.
CREATE OR REPLACE FUNCTION public.bg_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  trial_days integer;
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  SELECT coalesce((value #>> '{}')::integer, 30) INTO trial_days FROM public.app_settings WHERE key = 'trial_days';
  trial_days := coalesce(trial_days, 30);

  INSERT INTO public.profiles (id, full_name, avatar_path)
  VALUES (
    NEW.id,
    left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 60),
    CASE WHEN (meta ->> 'avatar_url') LIKE 'https://%' THEN meta ->> 'avatar_url' END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.presence (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (subject_type, user_id, status, trial_started_at, trial_ends_at)
  VALUES ('user', NEW.id, 'trialing', now(), now() + make_interval(days => trial_days))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.bg_handle_new_user();
  END IF;
END $$;
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Bakım işleri (pg_cron + Vercel Cron)
-- Süreler packages/domain (PRESENCE_DEFAULTS, MATCH_TIMEOUTS) ile aynıdır.
CREATE OR REPLACE FUNCTION public.bg_run_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n_presence integer;
  n_requests integer;
  n_walkins integer;
  n_results integer;
  n_bulletins integer;
  n_subs integer;
BEGIN
  -- Süresi dolan durumlar Çevrimdışı olur
  UPDATE public.presence
     SET status = 'offline', play_intent = NULL, eta = NULL, expires_at = NULL, updated_at = now()
   WHERE status <> 'offline' AND expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS n_presence = ROW_COUNT;

  -- Yanıtlanmayan / başlamayan istekler
  UPDATE public.matches SET status = 'expired', status_reason = 'timeout', updated_at = now()
   WHERE (status = 'requested' AND scheduled_at IS NULL AND created_at < now() - interval '12 hours')
      OR (status = 'accepted' AND scheduled_at IS NULL AND accepted_at < now() - interval '6 hours')
      OR (status IN ('requested', 'accepted') AND scheduled_at IS NOT NULL AND scheduled_at < now() - interval '2 hours');
  GET DIAGNOSTICS n_requests = ROW_COUNT;

  -- 5 dakika içinde ikinci oyuncu katılıp onaylanmayan masa oturumları
  UPDATE public.matches SET status = 'expired', status_reason = 'walk_in_timeout', updated_at = now()
   WHERE status = 'waiting_opponent' AND created_at < now() - interval '5 minutes';
  GET DIAGNOSTICS n_walkins = ROW_COUNT;

  -- 24 saat içinde girilmeyen / onaylanmayan sonuçlar: sonuçsuz kapanır, istatistiğe işlenmez
  WITH stale AS (
    UPDATE public.matches SET status = 'void', status_reason = 'result_timeout', updated_at = now()
     WHERE status IN ('awaiting_result', 'pending_confirmation') AND ended_at < now() - interval '24 hours'
    RETURNING id
  ), voided AS (
    UPDATE public.match_results r SET status = 'voided'
      FROM stale WHERE r.match_id = stale.id AND r.status = 'submitted'
    RETURNING r.id
  )
  SELECT count(*) INTO n_results FROM stale;

  -- Planlanan bülten içerikleri yayına alınır
  UPDATE public.bulletins SET status = 'published', published_at = now(), updated_at = now()
   WHERE status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= now();
  GET DIAGNOSTICS n_bulletins = ROW_COUNT;

  -- Abonelik süreleri (3 gün ödeme toleransı)
  WITH changed AS (
    UPDATE public.subscriptions s SET
      status = CASE
        WHEN s.status = 'trialing' AND s.trial_ends_at < now() THEN 'expired'::public.subscription_status
        WHEN s.status = 'active' AND s.current_period_end < now() THEN 'past_due'::public.subscription_status
        WHEN s.status = 'past_due' AND s.current_period_end < now() - interval '3 days' THEN 'expired'::public.subscription_status
        ELSE s.status END,
      updated_at = now()
    WHERE (s.status = 'trialing' AND s.trial_ends_at < now())
       OR (s.status = 'active' AND s.current_period_end < now())
       OR (s.status = 'past_due' AND s.current_period_end < now() - interval '3 days')
    RETURNING s.id, s.status
  )
  INSERT INTO public.subscription_events (subscription_id, event, to_status, note)
  SELECT id, 'status_changed', status, 'Otomatik: süre doldu' FROM changed;
  GET DIAGNOSTICS n_subs = ROW_COUNT;

  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';

  RETURN jsonb_build_object(
    'presence_expired', n_presence,
    'matches_expired', n_requests,
    'walkins_expired', n_walkins,
    'results_voided', n_results,
    'bulletins_published', n_bulletins,
    'subscriptions_changed', n_subs
  );
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'bilardogo-maintenance';
    PERFORM cron.schedule('bilardogo-maintenance', '* * * * *', 'SELECT public.bg_run_maintenance()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron kurulamadı (%): bakım işleri Vercel Cron ile çalışır.', SQLERRM;
END $$;
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Row Level Security
-- Tüm yazma ve okumalar sunucudaki tRPC katmanından (yetkili bağlantı) yapılır ve orada yetkilendirilir.
-- Tarayıcıya verilen anon anahtarla PostgREST üzerinden hiçbir tabloya erişilemez: RLS açık, politika yok.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_\_%' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END $$;
--> statement-breakpoint

-- SECURITY DEFINER fonksiyonları PostgREST RPC üzerinden çağrılamasın
REVOKE EXECUTE ON FUNCTION
  public.bg_broadcast(text, text, jsonb, boolean),
  public.bg_run_maintenance(),
  public.bg_handle_new_user(),
  public.bg_match_players_set_active(),
  public.bg_matches_sync_active(),
  public.bg_matches_check_table(),
  public.bg_rt_presence(),
  public.bg_rt_match(),
  public.bg_rt_order(),
  public.bg_rt_message(),
  public.bg_rt_notification(),
  public.bg_rt_venue_tables()
FROM PUBLIC;
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Realtime yetkilendirme
-- Özel kanallar (user:, conv:, order:, venue:<id>:staff) yalnız yetkili kullanıcıya açılır.
-- venue:<id> ve city:<n> herkese açık kanallardır ve yalnız "değişti" sinyali taşır.
CREATE OR REPLACE FUNCTION public.bg_can_listen(p_topic text, p_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parts text[] := string_to_array(p_topic, ':');
  target uuid;
BEGIN
  IF p_uid IS NULL OR array_length(parts, 1) < 2 THEN
    RETURN false;
  END IF;
  BEGIN
    target := parts[2]::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN parts[1] = 'city';
  END;
  CASE parts[1]
    WHEN 'user' THEN
      RETURN target = p_uid;
    WHEN 'conv' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.conversations c
         WHERE c.id = target
           AND (c.type <> 'dm' OR EXISTS (
             SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = p_uid)));
    WHEN 'order' THEN
      RETURN EXISTS (SELECT 1 FROM public.order_participants p WHERE p.order_id = target AND p.user_id = p_uid)
          OR EXISTS (
            SELECT 1 FROM public.orders o
              JOIN public.venues v ON v.id = o.venue_id
              JOIN public.business_members bm ON bm.business_id = v.business_id
             WHERE o.id = target AND bm.user_id = p_uid);
    WHEN 'venue' THEN
      IF array_length(parts, 1) = 3 AND parts[3] = 'staff' THEN
        RETURN EXISTS (
          SELECT 1 FROM public.venues v JOIN public.business_members bm ON bm.business_id = v.business_id
           WHERE v.id = target AND bm.user_id = p_uid);
      END IF;
      RETURN true;
    ELSE
      RETURN false;
  END CASE;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "bilardogo_realtime_listen" ON realtime.messages;
    CREATE POLICY "bilardogo_realtime_listen" ON realtime.messages
      FOR SELECT TO authenticated
      USING (public.bg_can_listen((SELECT realtime.topic()), (SELECT auth.uid())));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.bg_can_listen(text, uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.bg_can_listen(text, uuid) TO authenticated;
  END IF;
END $$;
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────── Storage bucket'ları
-- Yüklemeler sunucunun ürettiği imzalı yükleme URL'leriyle yapılır; bu yüzden storage.objects politikası gerekmez.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
      ('public-media', 'public-media', true, 52428800,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm']),
      ('chat-media', 'chat-media', false, 52428800,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm']),
      ('business-docs', 'business-docs', false, 15728640,
        ARRAY['application/pdf','image/jpeg','image/png'])
    ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
