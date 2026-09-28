'use client';
import { isValidTaxId, normalizeTrPhone } from '@bilardogo/domain';
import { Field, Input } from '@bilardogo/ui';

export type BusinessInfoValue = { legalName: string; taxId: string; taxOffice: string; contactPhone: string };
export type BusinessInfoErrors = Partial<Record<keyof BusinessInfoValue, string>>;

export const EMPTY_BUSINESS_INFO: BusinessInfoValue = { legalName: '', taxId: '', taxOffice: '', contactPhone: '' };

export function validateBusinessInfo(v: BusinessInfoValue): BusinessInfoErrors {
  const e: BusinessInfoErrors = {};
  const name = v.legalName.trim();
  if (name.length < 2) e.legalName = 'Ticari unvanı girin.';
  else if (name.length > 160) e.legalName = 'Unvan en fazla 160 karakter olabilir.';
  const tax = v.taxId.replace(/\s/g, '');
  if (!/^\d{10,11}$/.test(tax)) e.taxId = 'VKN 10, TCKN 11 haneli olmalı.';
  else if (!isValidTaxId(tax)) e.taxId = tax.length === 11 ? 'Geçersiz T.C. Kimlik No.' : 'Geçersiz Vergi Kimlik No.';
  const office = v.taxOffice.trim();
  if (office.length < 2) e.taxOffice = 'Vergi dairesini girin.';
  else if (office.length > 80) e.taxOffice = 'Vergi dairesi en fazla 80 karakter olabilir.';
  if (!normalizeTrPhone(v.contactPhone)) e.contactPhone = 'Geçerli bir telefon numarası girin (ör. 0532 111 22 33).';
  return e;
}

export function cleanBusinessInfo(v: BusinessInfoValue): BusinessInfoValue {
  return { legalName: v.legalName.trim(), taxId: v.taxId.replace(/\s/g, ''), taxOffice: v.taxOffice.trim(), contactPhone: v.contactPhone.trim() };
}

export function BusinessInfoFields({
  value,
  onChange,
  errors = {},
}: {
  value: BusinessInfoValue;
  onChange: (v: BusinessInfoValue) => void;
  errors?: BusinessInfoErrors;
}) {
  const patch = (p: Partial<BusinessInfoValue>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-4">
      <Field label="Ticari unvan" required error={errors.legalName} hint="Vergi levhasında yazan unvan (şahıs işletmesiyse ad soyad).">
        <Input value={value.legalName} onChange={(e) => patch({ legalName: e.target.value })} placeholder="ör. FBN Bilardo Spor Hizmetleri Ltd. Şti." maxLength={160} />
      </Field>
      <Field label="VKN / TCKN" required error={errors.taxId} hint="Şirketler için 10 haneli VKN, şahıs işletmeleri için 11 haneli TCKN.">
        <Input
          inputMode="numeric"
          value={value.taxId}
          onChange={(e) => patch({ taxId: e.target.value.replace(/[^\d]/g, '').slice(0, 11) })}
          placeholder="1234567890"
          className="tabular-nums"
        />
      </Field>
      <Field label="Vergi dairesi" required error={errors.taxOffice}>
        <Input value={value.taxOffice} onChange={(e) => patch({ taxOffice: e.target.value })} placeholder="ör. Kadıköy" maxLength={80} />
      </Field>
      <Field label="İletişim telefonu" required error={errors.contactPhone} hint="BilardoGo ekibi başvurunla ilgili bu numaradan ulaşır.">
        <Input type="tel" inputMode="tel" value={value.contactPhone} onChange={(e) => patch({ contactPhone: e.target.value })} placeholder="0532 111 22 33" maxLength={20} />
      </Field>
    </div>
  );
}
