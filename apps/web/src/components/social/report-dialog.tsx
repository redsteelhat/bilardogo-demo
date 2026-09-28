'use client';
import { REPORT_REASON_LABELS, REPORT_REASONS } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, DialogFooter, Field, Segmented, Textarea, toast } from '@bilardogo/ui';
import { useEffect, useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Reason = (typeof REPORT_REASONS)[number];

/** Kullanıcı / mesaj / salon şikâyeti. Mesaj şikâyetinde içerik moderasyon için sunucuda saklanır. */
export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  subject,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: 'user' | 'message' | 'venue';
  targetId: string;
  subject?: string;
}) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails('');
      setTouched(false);
    }
  }, [open]);
  const report = trpc.social.report.useMutation({
    onSuccess: () => {
      toast.success('Şikâyetin alındı', { description: 'Moderasyon ekibimiz inceleyecek. Teşekkürler.' });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const detailsRequired = reason === 'other' && details.trim().length < 5;
  const submit = () => {
    setTouched(true);
    if (!reason || detailsRequired) return;
    report.mutate({ targetType, targetId, reason, details: details.trim() || null });
  };
  const title = targetType === 'message' ? 'Mesajı şikâyet et' : targetType === 'venue' ? 'Salonu şikâyet et' : 'Kullanıcıyı şikâyet et';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={subject}>
        <div className="space-y-4">
          <Field label="Sebep" required error={touched && !reason ? 'Bir sebep seç' : undefined}>
            <Segmented
              wrap
              value={reason}
              onChange={setReason}
              options={REPORT_REASONS.map((r) => ({ value: r, label: REPORT_REASON_LABELS[r] }))}
            />
          </Field>
          <Field
            label="Açıklama"
            hint={reason === 'other' ? 'Kısaca ne olduğunu yaz' : 'Opsiyonel'}
            error={touched && detailsRequired ? 'Lütfen kısa bir açıklama yaz (en az 5 karakter).' : undefined}
          >
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder="Ne oldu?" />
          </Field>
          <p className="text-xs text-subtle">
            Şikâyetin gizli tutulur. Özel mesajlarda yalnız şikâyet edilen mesajın içeriği moderasyon için görüntülenir.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="danger" loading={report.isPending} onClick={submit}>
            Şikâyet et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
