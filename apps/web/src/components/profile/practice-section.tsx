'use client';
import { APP_TIME_ZONE, computeAverage, formatAverage, GAME_SHORT_LABELS } from '@bilardogo/domain';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  Segmented,
  StatTile,
  Switch,
  Textarea,
  toast,
} from '@bilardogo/ui';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import type { Profile } from './types';

type PracticeGame = 'three_cushion' | 'carom';

function todayIso() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 3 Bant / Karambol manuel ortalama: antrenmanda yapılan sayı ve isteka. */
export function PracticeSection({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const utils = trpc.useUtils();
  const username = profile.user.username ?? '';
  const del = trpc.players.deletePractice.useMutation({
    onSuccess: async () => {
      await utils.players.profile.invalidate({ username });
      toast('Antrenman kaydı silindi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const list = profile.practice;
  const visible = showAll ? list : list.slice(0, 5);
  const pa = profile.practiceAverages;
  return (
    <Card>
      <CardHeader
        icon={<NotebookPen className="h-5 w-5" />}
        title="Manuel ortalama"
        description="3 Bant / Karambol antrenman ortalaması (sayı ÷ isteka)"
        action={
          profile.isMe ? (
            <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Ekle
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(['three_cushion', 'carom'] as const).map((g) => (
            <StatTile
              key={g}
              label={`${GAME_SHORT_LABELS[g]} manuel`}
              value={<span className="tabular-nums text-brand">{formatAverage(pa[g].average)}</span>}
              hint={pa[g].sessions ? `${pa[g].sessions} antrenman` : 'Kayıt yok'}
            />
          ))}
        </div>
        {list.length ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface-2">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{GAME_SHORT_LABELS[p.gameType]}</span>
                    <span className="text-muted tabular-nums">
                      {p.score} sayı / {p.innings} isteka
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-subtle">
                    {formatDate(`${p.playedOn}T12:00:00Z`, { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}en yüksek seri {p.highRun ?? 'bilinmiyor'}
                    {p.note ? ` · ${p.note}` : ''}
                  </div>
                </div>
                <span className="font-display text-lg font-semibold tabular-nums text-brand">{formatAverage(p.average)}</span>
                {profile.isMe ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Kaydı sil"
                    loading={del.isPending && del.variables?.id === p.id}
                    onClick={() => {
                      if (window.confirm('Bu antrenman kaydı silinsin mi?')) del.mutate({ id: p.id });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
            {profile.isMe ? 'Antrenmanda yaptığın sayı ve istekayı ekleyerek manuel ortalamanı takip et.' : 'Henüz manuel ortalama kaydı yok.'}
          </p>
        )}
        {list.length > 5 ? (
          <Button size="sm" variant="ghost" block onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Daha az göster' : `Tümünü göster (${list.length})`}
          </Button>
        ) : null}
      </CardBody>
      {profile.isMe ? <PracticeDialog open={open} onOpenChange={setOpen} username={username} defaultGame={profile.user.gameTypes.includes('carom') && !profile.user.gameTypes.includes('three_cushion') ? 'carom' : 'three_cushion'} /> : null}
    </Card>
  );
}

function PracticeDialog({
  open,
  onOpenChange,
  username,
  defaultGame,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  username: string;
  defaultGame: PracticeGame;
}) {
  const [game, setGame] = useState<PracticeGame>(defaultGame);
  const [score, setScore] = useState('');
  const [innings, setInnings] = useState('');
  const [highRun, setHighRun] = useState('');
  const [unknownRun, setUnknownRun] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setGame(defaultGame);
      setScore('');
      setInnings('');
      setHighRun('');
      setUnknownRun(false);
      setDate(todayIso());
      setNote('');
      setTouched(false);
    }
  }, [open, defaultGame]);
  const utils = trpc.useUtils();
  const add = trpc.players.addPractice.useMutation({
    onSuccess: async (r) => {
      await utils.players.profile.invalidate({ username });
      toast.success('Antrenman eklendi', { description: `Ortalama ${formatAverage(r.average)}` });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const s = Number(score);
  const i = Number(innings);
  const h = Number(highRun);
  const errors = {
    score: score === '' ? 'Sayıyı gir' : !Number.isInteger(s) || s < 0 || s > 5000 ? '0–5000 arası tam sayı olmalı' : null,
    innings: innings === '' ? 'İsteka sayısını gir' : !Number.isInteger(i) || i < 1 || i > 5000 ? '1–5000 arası tam sayı olmalı' : null,
    highRun: unknownRun
      ? null
      : highRun === ''
        ? 'En yüksek seriyi gir ya da “Hatırlamıyorum”u seç'
        : !Number.isInteger(h) || h < 0
          ? 'Geçerli bir sayı gir'
          : score !== '' && h > s
            ? 'Seri toplam sayıdan büyük olamaz'
            : null,
    date: !/^\d{4}-\d{2}-\d{2}$/.test(date) ? 'Tarih seç' : date > todayIso() ? 'İleri bir tarih seçilemez' : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const preview = !errors.score && !errors.innings ? computeAverage(s, i) : null;
  const submit = () => {
    setTouched(true);
    if (!valid) return;
    add.mutate({ gameType: game, score: s, innings: i, highRun: unknownRun ? null : h, playedOn: date, note: note.trim() || null });
  };
  const num = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Antrenman ekle" description="Sayı ve isteka girildiğinde ortalama otomatik hesaplanır.">
        <div className="space-y-4">
          <Field label="Oyun" required>
            <Segmented
              value={game}
              onChange={setGame}
              options={(['three_cushion', 'carom'] as const).map((g) => ({ value: g, label: GAME_SHORT_LABELS[g] }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sayı" required error={touched ? errors.score : undefined}>
              <Input inputMode="numeric" value={score} onChange={(e) => setScore(num(e.target.value))} placeholder="Örn. 30" />
            </Field>
            <Field label="İsteka" required error={touched ? errors.innings : undefined}>
              <Input inputMode="numeric" value={innings} onChange={(e) => setInnings(num(e.target.value))} placeholder="Örn. 40" />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted">Ortalama</span>
            <span className="font-display text-2xl font-semibold tabular-nums text-brand">{formatAverage(preview)}</span>
          </div>
          <Field label="En yüksek seri" required error={touched ? errors.highRun : undefined}>
            <div className="flex items-center gap-3">
              <Input
                inputMode="numeric"
                value={unknownRun ? '' : highRun}
                disabled={unknownRun}
                onChange={(e) => setHighRun(num(e.target.value))}
                placeholder={unknownRun ? 'Bilinmiyor' : 'Örn. 5'}
                className="flex-1"
              />
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <Switch checked={unknownRun} onCheckedChange={setUnknownRun} aria-label="Hatırlamıyorum" />
                Hatırlamıyorum
              </label>
            </div>
          </Field>
          <Field label="Tarih" required error={touched ? errors.date : undefined}>
            <Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Not" hint="Opsiyonel">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={2} placeholder="Örn. FBN’de seri çalışması" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button loading={add.isPending} onClick={submit}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
