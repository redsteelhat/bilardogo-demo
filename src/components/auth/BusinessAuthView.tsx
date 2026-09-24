import React, { useState } from 'react';
import { Store, Lock, Mail, Phone, MapPin, Building2, DollarSign, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Clock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CITIES } from '../../data/mockData';

export const BusinessAuthView: React.FC = () => {
  const {
    salons,
    selectedSalonId,
    setSelectedSalonId,
    setCurrentRole,
    setActiveView,
    registerNewSalon,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [selectedLoginSalonId, setSelectedLoginSalonId] = useState(selectedSalonId || salons[0]?.id || 'salon-fbn');
  const [loginIdentifier, setLoginIdentifier] = useState('kadikoy@fbn-bilardo.com');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regSalonName, setRegSalonName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regCity, setRegCity] = useState('İstanbul');
  const [regDistrict, setRegDistrict] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regTaxNumber, setRegTaxNumber] = useState('');
  const [regHourlyRate, setRegHourlyRate] = useState(280);
  const [regOpenHours, setRegOpenHours] = useState('10:00 - 02:00');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedSalonId(selectedLoginSalonId);
    setCurrentRole('isletme');
    setActiveView('business_dashboard');
    window.location.hash = 'salon';
    const s = salons.find(x => x.id === selectedLoginSalonId);
    showToast(`${s?.name || 'Salon'} İşletme Paneline giriş yapıldı.`);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSalonName.trim() || !regPhone.trim() || !regPassword.trim()) {
      showToast('Lütfen zorunlu alanları (Salon Adı, Telefon, Şifre) doldurunuz.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Belirlediğiniz şifreler uyuşmuyor.');
      return;
    }

    const newSalon = registerNewSalon({
      name: regSalonName,
      city: regCity,
      district: regDistrict || 'Merkez',
      address: regAddress || `${regDistrict || 'Merkez'}, ${regCity}`,
      phone: regPhone,
      taxNumber: regTaxNumber,
      hourlyRate: Number(regHourlyRate) || 250,
      openHours: regOpenHours || '10:00 - 02:00',
      description: `${regOwnerName ? regOwnerName + ' yönetiminde ' : ''}${regSalonName} bilardo kulübü.`,
    });

    setCurrentRole('isletme');
    setSelectedSalonId(newSalon.id);
    setActiveView('business_dashboard');
    window.location.hash = 'salon';
    showToast(`Tebrikler! ${newSalon.name} kaydedildi ve 30 günlük ücretsiz deneme başladı.`);
  };

  const handleQuickDemoSalon = (salonId: string) => {
    setSelectedSalonId(salonId);
    setCurrentRole('isletme');
    setActiveView('business_dashboard');
    window.location.hash = 'salon';
    const s = salons.find(x => x.id === salonId);
    showToast(`${s?.name || 'Salon'} İşletme Paneline hızlı giriş yapıldı.`);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Back & Mode indicator */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveView('home');
              window.location.hash = '';
            }}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Oyuncu Sayfası</span>
          </button>

          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            İşletme Portali
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-neutral-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white font-display">
            Salon İşletme Girişi
          </h1>
          <p className="text-xs text-neutral-400">
            Masa durumu kontrolü, mutfak siparişleri, salon turnuvaları ve saat ücreti yönetimi.
          </p>
        </div>

        {/* Tab Toggle: Login vs Register */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('LOGIN')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'LOGIN'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Salon Girişi
          </button>
          <button
            type="button"
            onClick={() => setMode('REGISTER')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'REGISTER'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Yeni Salon Kaydı (30 Gün Ücretsiz)
          </button>
        </div>

        {/* 1. LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* Salon Seçimi */}
            <div className="space-y-1.5">
              <label className="text-neutral-300 font-medium block">Yöneteceğiniz Salonu Seçin</label>
              <div className="relative">
                <Store className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedLoginSalonId}
                  onChange={e => setSelectedLoginSalonId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {salons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city} - {s.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-medium block">İşletme E-Posta / Telefon</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  placeholder="iletisim@bilardosalonu.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-medium block">İşletme Şifresi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Store className="w-4 h-4" />
              <span>İşletme Paneline Giriş Yap</span>
            </button>

            {/* Quick Demo Salon Pickers */}
            <div className="pt-2 space-y-2">
              <div className="text-[11px] text-neutral-400 font-medium text-center">
                Demo Olarak Doğrudan Giriş Yapın:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {salons.slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleQuickDemoSalon(s.id)}
                    className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-amber-400 transition-colors text-center truncate"
                    title={s.name}
                  >
                    {s.name.split(' ')[0]} Paneli
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-400">
              <Sparkles className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold">
                Yeni salon kaydında ilk 30 gün tamamen ücretsiz! Kredi kartı gerekmez.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-300 font-medium block">Salon Adı *</label>
              <input
                type="text"
                value={regSalonName}
                onChange={e => setRegSalonName(e.target.value)}
                placeholder="Örn: Moda Bilardo Kulübü & Akademi"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Yetkili Ad Soyad</label>
                <input
                  type="text"
                  value={regOwnerName}
                  onChange={e => setRegOwnerName(e.target.value)}
                  placeholder="Yetkili işletmeci"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Telefon *</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="0216 123 45 67"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Şehir *</label>
                <select
                  value={regCity}
                  onChange={e => setRegCity(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">İlçe</label>
                <input
                  type="text"
                  value={regDistrict}
                  onChange={e => setRegDistrict(e.target.value)}
                  placeholder="Örn: Kadıköy"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-300 font-medium block">Açık Adres</label>
              <input
                type="text"
                value={regAddress}
                onChange={e => setRegAddress(e.target.value)}
                placeholder="Cadde, sokak, no, semt"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Saatlik Masa Ücreti (TL) *</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={regHourlyRate}
                    onChange={e => setRegHourlyRate(Number(e.target.value))}
                    placeholder="250"
                    className="w-full pl-8 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Çalışma Saatleri</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regOpenHours}
                    onChange={e => setRegOpenHours(e.target.value)}
                    placeholder="10:00 - 02:00"
                    className="w-full pl-8 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-300 font-medium block">Vergi No / VKN (Doğrulama için)</label>
              <input
                type="text"
                value={regTaxNumber}
                onChange={e => setRegTaxNumber(e.target.value)}
                placeholder="10 haneli VKN"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Şifre Belirle *</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Şifre Tekrar *</label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="Şifreyi onaylayın"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-3"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salon İşletmesi Kaydı Yap & Başla</span>
            </button>
          </form>
        )}

        {/* Footer switch to Admin Auth */}
        <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>Süper Admin misiniz?</span>
          <button
            type="button"
            onClick={() => {
              setActiveView('admin_auth');
              window.location.hash = 'admin';
            }}
            className="text-red-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>Admin Girişine Git</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
