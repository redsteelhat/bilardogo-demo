-- Çalışan eklerken e-postadan kullanıcı bulmak için (yalnız service_role çağırabilir).
CREATE OR REPLACE FUNCTION public.bg_find_user_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.bg_find_user_by_email(text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.bg_find_user_by_email(text) TO service_role;
  END IF;
END $$;
