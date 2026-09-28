'use client';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, toast } from '@bilardogo/ui';
import { useEffect, useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';

/** Katılım koduyla sipariş oturumuna katıl (ör. BGO-7K2Q). */
export function JoinOrderDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJoined: (orderId: string) => void;
}) {
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setCode('');
      setTouched(false);
    }
  }, [open]);
  const utils = trpc.useUtils();
  const join = trpc.orders.join.useMutation({
    onSuccess: async (r) => {
      await utils.orders.invalidate();
      toast.success('Sipariş oturumuna katıldın');
      onOpenChange(false);
      onJoined(r.id);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const clean = code.trim().toUpperCase();
  const invalid = clean.replace(/[^A-Z0-9]/g, '').length < 4;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Oturuma katıl" description="Masadaki arkadaşının paylaştığı katılım kodunu gir.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!invalid) join.mutate({ code: clean });
          }}
        >
          <Field label="Katılım kodu" required error={touched && invalid ? 'Geçerli bir kod gir (ör. BGO-7K2Q).' : undefined}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
              placeholder="BGO-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              autoFocus
              className="text-center font-display text-xl tracking-widest"
            />
          </Field>
          <p className="mt-2 text-xs text-subtle">Maçı izliyorsan masanın oturumuna “İzleyici” olarak katılırsın.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" loading={join.isPending}>
              Katıl
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
