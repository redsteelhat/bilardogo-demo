import React, { useState } from 'react';
import { Shield, Lock, Mail, Key, UserCheck, ArrowLeft, CheckCircle2, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminAuthView: React.FC = () => {
  const { setCurrentRole, setActiveView, showToast } = useApp();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login state
  const [loginEmail, setLoginEmail] = useState('admin@bilardogo.com');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [securityKey, setSecurityKey] = useState('ADM-2026-BGO');
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAuthCode, setRegAuthCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Lütfen tüm giriş alanlarını doldurunuz.');
      return;
    }
    setCurrentRole('admin');
    setActiveView('admin_dashboard');
    window.location.hash = 'admin';
    showToast('Süper Admin paneline başarıyla giriş yapıldı.');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regAuthCode.trim()) {
      showToast('Lütfen tüm zorunlu kayıt alanlarını doldurunuz.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }
    if (!acceptedTerms) {
      showToast('Lütfen Yönetici Güvenlik Sözleşmesini onaylayınız.');
      return;
    }
    setCurrentRole('admin');
    setActiveView('admin_dashboard');
    window.location.hash = 'admin';
    showToast(`Tebrikler ${regName}, Süper Admin kaydınız tamamlandı ve oturum açıldı!`);
  };

  const handleQuickDemoLogin = () => {
    setCurrentRole('admin');
    setActiveView('admin_dashboard');
    window.location.hash = 'admin';
    showToast('Demo Süper Admin hesabı ile doğrudan giriş yapıldı.');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

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

          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            Yetkili Portali
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-red-600/25 border border-red-500/30">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white font-display">
            Süper Admin Girişi
          </h1>
          <p className="text-xs text-neutral-400">
            BilardoGo platform moderasyonu, salon onayları ve merkezi sistem kontrolü.
          </p>
        </div>

        {/* Tab Toggle: Login vs Register */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('LOGIN')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'LOGIN'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Admin Girişi
          </button>
          <button
            type="button"
            onClick={() => setMode('REGISTER')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'REGISTER'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Admin Kaydı
          </button>
        </div>

        {/* 1. LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-neutral-300 font-medium block">Yönetici E-Postası</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="admin@bilardogo.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-medium block">Yönetici Şifresi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
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

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-medium flex items-center justify-between">
                <span>Admin Güvenlik Anahtarı (Security PIN)</span>
                <span className="text-[10px] text-red-400 font-mono">2FA / Master Token</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={securityKey}
                  onChange={e => setSecurityKey(e.target.value)}
                  placeholder="ADM-2026-BGO"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 font-mono uppercase focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-2xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Shield className="w-4 h-4" />
              <span>Yönetici Olarak Giriş Yap</span>
            </button>

            {/* Quick Demo Login */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>🚀 Tek Tıkla Hızlı Test Girişi (Süper Admin)</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-neutral-300 font-medium block">Ad Soyad</label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Örn: BilardoGo Sistem Yöneticisi"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-300 font-medium block">Resmi E-Posta</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="admin@bilardogo.com"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-300 font-medium flex items-center justify-between">
                <span>Yetkilendirme / Davet Kodu</span>
                <span className="text-[10px] text-neutral-500">Merkezden Sağlanan Kod</span>
              </label>
              <input
                type="text"
                value={regAuthCode}
                onChange={e => setRegAuthCode(e.target.value)}
                placeholder="Örn: BGO-SUPER-ADM-99"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 font-mono uppercase focus:outline-none focus:border-red-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Şifre Belirle</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Şifre Tekrar</label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="Şifreyi onaylayın"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-[11px] text-neutral-400 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-950 text-red-600 focus:ring-0 mt-0.5"
              />
              <span>
                Merkezi veri güvenliği, KVKK ve platform moderasyon yönetmeliğini kabul ediyorum.
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-2xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Yönetici Hesabı Oluştur ve Başla</span>
            </button>
          </form>
        )}

        {/* Footer switch to Salon Auth */}
        <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>Salon işletmecisi misiniz?</span>
          <button
            type="button"
            onClick={() => {
              setActiveView('business_auth');
              window.location.hash = 'salon';
            }}
            className="text-amber-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>Salon Girişine Git</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
