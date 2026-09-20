import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, Camera, CheckCircle, AlertTriangle, Play, Sparkles, Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BilliardGameType, SalonTable } from '../../types';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'SCAN' | 'GENERATE_TABLE' | 'GENERATE_ORDER';
  tableData?: {
    salonId: string;
    salonName: string;
    tableNumber: number;
    allowedGames: BilliardGameType[];
  };
  orderCode?: string;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  mode,
  tableData,
  orderCode,
}) => {
  const {
    currentUser,
    users,
    salons,
    activeMatch,
    startMatchOnTable,
    quickJoinTableWithoutMatch,
    showToast,
    setActiveView,
    setSelectedSalonId,
  } = useApp();

  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [selectedScanSalonId, setSelectedScanSalonId] = useState<string>('salon-fbn');
  const [selectedScanTableNumber, setSelectedScanTableNumber] = useState<number>(1);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('usr-tarik');
  const [selectedGameType, setSelectedGameType] = useState<BilliardGameType>('3_BANT');
  const [scanningSimulated, setScanningSimulated] = useState(false);

  // Generate QR code when tableData or orderCode is provided
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'GENERATE_TABLE' && tableData) {
      const qrPayload = `BILARDOGO://SALON/${tableData.salonId}/TABLE/${tableData.tableNumber}`;
      QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(url => setQrImageUrl(url)).catch(err => console.error(err));
    } else if (mode === 'GENERATE_ORDER') {
      const qrPayload = `BILARDOGO://ORDER/${orderCode || 'BGO-LIVE'}`;
      QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(url => setQrImageUrl(url)).catch(err => console.error(err));
    }
  }, [isOpen, mode, tableData, orderCode]);

  if (!isOpen) return null;

  const currentSalon = salons.find(s => s.id === selectedScanSalonId) || salons[0];
  const targetTable = currentSalon.tables.find(t => t.tableNumber === Number(selectedScanTableNumber));

  // Handle simulated scan execution
  const handleExecuteScan = () => {
    setScanningSimulated(true);

    setTimeout(() => {
      setScanningSimulated(false);

      if (!targetTable) {
        showToast('Geçersiz masa QR kodu!');
        return;
      }

      if (targetTable.status !== 'BOS') {
        showToast(`Masa ${targetTable.tableNumber} şu anda ${targetTable.status === 'DOLU' ? 'Dolu' : 'Bakımda'}! Lütfen boş bir masa seçin.`);
        return;
      }

      // If user already has an accepted match waiting to start
      if (activeMatch && activeMatch.status === 'KABUL_EDILDI') {
        const success = startMatchOnTable(activeMatch.id, targetTable.id);
        if (success) {
          onClose();
          setSelectedSalonId(selectedScanSalonId);
          setActiveView('active_match');
        }
      } else {
        // Quick join directly at the table
        const success = quickJoinTableWithoutMatch(
          selectedScanSalonId,
          Number(selectedScanTableNumber),
          selectedOpponentId,
          selectedGameType
        );
        if (success) {
          onClose();
          setSelectedSalonId(selectedScanSalonId);
          setActiveView('active_match');
        }
      }
    }, 1200);
  };

  const availableOpponents = users.filter(
    u => u.id !== currentUser.id && u.salonStatus === 'SALONDA'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-neutral-100 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {mode === 'SCAN' ? 'Masa QR Kodu Okut' : mode === 'GENERATE_TABLE' ? 'Masa QR Tanımlayıcısı' : 'Sipariş QR Kodu'}
              </h3>
              <p className="text-xs text-neutral-400">
                {mode === 'SCAN' ? 'Kameranızı masadaki QR koda tutun' : 'Salondaki masaya yapıştırılacak resmi QR kod'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {mode === 'SCAN' ? (
            <div className="space-y-4">
              {/* Camera viewfinder simulator */}
              <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-2xl bg-neutral-950 border-2 border-neutral-800 overflow-hidden flex flex-col items-center justify-center p-4">
                
                {/* Scanner animation line */}
                <div className="absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                
                {/* Corner guide markers */}
                <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

                <div className="text-center space-y-2 z-10 px-4">
                  <Camera className="w-10 h-10 text-neutral-600 mx-auto animate-bounce" />
                  <p className="text-xs text-neutral-400 font-medium">
                    Masadaki BilardoGo QR Kodunu bu çerçeve içine hizalayın
                  </p>
                </div>

                {scanningSimulated && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 z-20">
                    <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
                    <span className="text-xs font-semibold text-white">QR Doğrulanıyor ve Masaya Bağlanılıyor...</span>
                  </div>
                )}
              </div>

              {/* Status Context Info */}
              {activeMatch && activeMatch.status === 'KABUL_EDILDI' ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Bekleyen Maçınız Var
                  </div>
                  <p className="text-neutral-300">
                    Kabul edilmiş maçınız bulunuyor. QR okuttuğunuzda maç bu masaya bağlanacak ve masa <strong className="text-white">Dolu</strong> olarak işaretlenecektir.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Masada Hızlı Oturum
                  </div>
                  <p className="text-neutral-400">
                    Önceden maç oluşturmadıysanız masanın QR kodunu okutup salondaki rakibinizi seçerek maçı doğrudan başlatabilirsiniz.
                  </p>
                </div>
              )}

              {/* Quick Table Selector for Preview / Testing in Web Browser */}
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="text-xs font-medium text-neutral-400">Simüle Edilecek Masa ve Salon:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Salon</label>
                    <select
                      value={selectedScanSalonId}
                      onChange={e => setSelectedScanSalonId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {salons.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Masa No</label>
                    <select
                      value={selectedScanTableNumber}
                      onChange={e => setSelectedScanTableNumber(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {currentSalon.tables.map(t => (
                        <option key={t.id} value={t.tableNumber}>
                          Masa {t.tableNumber} ({t.status === 'BOS' ? 'Boş' : 'Dolu'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* If no pending match, allow opponent selection */}
                {(!activeMatch || activeMatch.status !== 'KABUL_EDILDI') && (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Rakip Oyuncu</label>
                      <select
                        value={selectedOpponentId}
                        onChange={e => setSelectedOpponentId(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        {availableOpponents.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.level})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Oyun Türü</label>
                      <select
                        value={selectedGameType}
                        onChange={e => setSelectedGameType(e.target.value as BilliardGameType)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="3_BANT">3 Bant</option>
                        <option value="KARAMBOL">Karambol</option>
                        <option value="AMERIKAN">Amerikan</option>
                        <option value="DOKUZ_TOP">9 Top</option>
                        <option value="SNOOKER">Snooker</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExecuteScan}
                  disabled={scanningSimulated}
                  className="w-full mt-3 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                >
                  <Play className="w-4 h-4 fill-neutral-950" />
                  QR Kodu Tara ve Masaya Başla
                </button>
              </div>
            </div>
          ) : (
            /* Table or Order QR display view */
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl w-fit mx-auto shadow-xl border-4 border-amber-500">
                {qrImageUrl ? (
                  <img src={qrImageUrl} alt="BilardoGo Table QR" className="w-56 h-56 mx-auto" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-neutral-400 text-xs">
                    QR Üretiliyor...
                  </div>
                )}
                <div className="mt-2 text-center text-neutral-900 font-bold text-xs uppercase tracking-wider">
                  BilardoGo • {tableData ? `Masa ${tableData.tableNumber}` : orderCode}
                </div>
              </div>

              {tableData && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
                  <div className="font-bold text-white">{tableData.salonName}</div>
                  <div className="text-neutral-400">
                    Oynanabilen Oyunlar: {tableData.allowedGames.map(g => g.replace('_', ' ')).join(', ')}
                  </div>
                  <p className="text-[11px] text-amber-400/80 pt-1">
                    Bu QR kodunu masanın üzerine yapıştırın. Oyuncular telefonlarından okutarak maçı otomatik başlatır.
                  </p>
                </div>
              )}

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                Masa QR Kodunu Yazdır
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
