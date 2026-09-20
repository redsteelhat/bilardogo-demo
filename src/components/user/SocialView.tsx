import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Reply,
  ShieldAlert,
  UserPlus,
  UserX,
  Users,
  Search,
  MoreVertical,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChatMessage, User } from '../../types';

export const SocialView: React.FC = () => {
  const {
    currentUser,
    users,
    salons,
    selectedCity,
    chatMessages,
    sendMessage,
    reportUserOrMessage,
    showToast,
  } = useApp();

  const [activeChannel, setActiveChannel] = useState<string>('turkiye');
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<User | null>(null);
  const [showReportModal, setShowReportModal] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState('Uygunsuz dil ve hakaret');

  // Channels list
  const currentSalon = salons.find(s => s.id === currentUser.currentSalonId) || salons[0];
  const dmUsers = users.filter(u => u.id !== currentUser.id);

  const currentChannelMessages = chatMessages.filter(m => {
    if (activeChannel.startsWith('dm_')) {
      return m.channelId === activeChannel;
    }
    return m.channelId === activeChannel;
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(
      activeChannel,
      inputText.trim(),
      undefined,
      replyingTo?.id
    );

    setInputText('');
    setReplyingTo(null);
  };

  const handleSimulateSendImage = () => {
    sendMessage(
      activeChannel,
      'Salon maçından bir kare 🎱',
      'https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&w=600&q=80',
      replyingTo?.id
    );
    setReplyingTo(null);
  };

  const handleExecuteReport = () => {
    if (!showReportModal) return;
    reportUserOrMessage(
      showReportModal.senderId,
      'MESAJ',
      showReportModal.id,
      showReportModal.text,
      reportReason
    );
    setShowReportModal(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5 animate-in fade-in duration-200">
      
      {/* Social Title & Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Sosyal & Sohbet
          </h2>
          <p className="text-xs text-neutral-400">
            Arkadaşların, salonların ve genel bilardo topluluğu akışı tek yerde.
          </p>
        </div>

        {/* Security badge notice from PDF page 13 */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Özel mesajlar şifreli saklanır, yalnızca şikayet halinde moderasyona açılır.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[650px] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Left: Channels & DM List */}
        <div className="p-4 border-r border-neutral-800 flex flex-col justify-between bg-neutral-950/60 overflow-y-auto space-y-4">
          <div className="space-y-4">
            
            {/* General Channels */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase px-2 tracking-wider">
                Genel Sohbetler
              </div>
              <button
                onClick={() => setActiveChannel('turkiye')}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeChannel === 'turkiye'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <span>🇹🇷 Türkiye Sohbeti</span>
                <span className="text-[10px] opacity-75">Genel</span>
              </button>

              <button
                onClick={() => setActiveChannel(`sehir_${selectedCity}`)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeChannel === `sehir_${selectedCity}`
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <span>📍 {selectedCity} Sohbeti</span>
                <span className="text-[10px] opacity-75">Şehir</span>
              </button>
            </div>

            {/* Salon Channels */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase px-2 tracking-wider">
                Salon Odası
              </div>
              <button
                onClick={() => setActiveChannel(`salon_${currentSalon.id}`)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeChannel === `salon_${currentSalon.id}`
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <span className="truncate">🎱 {currentSalon.name}</span>
                <span className="text-[10px] opacity-75">Salon</span>
              </button>
            </div>

            {/* Direct Messages */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase px-2 tracking-wider">
                Özel Mesajlar (DM)
              </div>
              {dmUsers.map(u => {
                const dmChannelId = `dm_${[currentUser.id, u.id].sort().join('_')}`;
                return (
                  <button
                    key={u.id}
                    onClick={() => setActiveChannel(dmChannelId)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center gap-2.5 transition-colors ${
                      activeChannel === dmChannelId
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                        : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                    <div className="truncate flex-1">
                      <div className="truncate font-semibold">{u.name}</div>
                      <div className="text-[10px] opacity-70 truncate">{u.level}</div>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right: Active Chat Messages & Input */}
        <div className="col-span-2 flex flex-col justify-between h-full bg-neutral-900">
          
          {/* Chat Channel Header */}
          <div className="px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm text-white">
                {activeChannel === 'turkiye'
                  ? 'Türkiye Sohbeti'
                  : activeChannel.startsWith('sehir_')
                  ? `${selectedCity} Sohbet Kanalı`
                  : activeChannel.startsWith('salon_')
                  ? `${currentSalon.name} Sohbeti`
                  : 'Özel Mesajlaşma'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                Canlı
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {currentChannelMessages.map(msg => {
              const isMine = msg.senderId === currentUser.id;
              const repliedMsg = chatMessages.find(m => m.id === msg.replyToId);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {/* Reply Reference if any */}
                  {repliedMsg && (
                    <div className="text-[10px] text-neutral-400 mb-1 px-2 py-0.5 rounded bg-neutral-950/50 border border-neutral-800/60 max-w-xs truncate">
                      ↳ Cevaplanan: {repliedMsg.senderName}: {repliedMsg.text}
                    </div>
                  )}

                  <div className={`flex items-end gap-2 max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-xl object-cover mb-1 shrink-0"
                      />
                    )}

                    <div
                      className={`p-3 rounded-2xl text-xs space-y-1 shadow-md ${
                        isMine
                          ? 'bg-amber-500 text-neutral-950 rounded-br-none font-medium'
                          : 'bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-bl-none'
                      }`}
                    >
                      {!isMine && (
                        <div className="font-bold text-[11px] text-amber-400">
                          {msg.senderName}
                        </div>
                      )}

                      <p className="leading-relaxed break-words">{msg.text}</p>

                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Paylaşılan görsel"
                          className="w-full max-h-48 rounded-xl object-cover mt-2"
                        />
                      )}

                      <div className={`text-[9px] text-right pt-0.5 ${isMine ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>
                        {msg.createdAt}
                      </div>
                    </div>

                    {/* Quick actions (Reply / Report) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        title="Mesaja Cevap Ver"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {!isMine && (
                        <button
                          onClick={() => setShowReportModal(msg)}
                          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                          title="Şikayet Et"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {currentChannelMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <p className="text-xs">Bu sohbette henüz mesaj yok. İlk mesajı siz gönderin!</p>
              </div>
            )}
          </div>

            {/* Input Bar */}
            <div className="p-3 bg-neutral-950/90 border-t border-neutral-800 space-y-2">
              {replyingTo && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 rounded-xl text-[11px] text-neutral-300">
                  <div className="truncate">
                    <span className="text-amber-400 font-semibold">{replyingTo.senderName}</span> yanıtlanıyor: {replyingTo.text}
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-neutral-500 hover:text-white ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateSendImage}
                  className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="Fotoğraf Paylaş"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Mesajınızı yazın..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

        </div>

      </div>

      {/* Moderation Report Modal (Page 13: "Şikayet / Moderasyon") */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Mesajı / Kullanıcıyı Şikayet Et
              </h4>
              <button onClick={() => setShowReportModal(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-neutral-400 italic">
                "{showReportModal.text}"
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Şikayet Nedeni</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                >
                  <option value="Uygunsuz dil ve hakaret">Uygunsuz dil ve hakaret</option>
                  <option value="Sportmenlik dışı davranış">Sportmenlik dışı davranış</option>
                  <option value="Spam veya reklam">Spam veya reklam</option>
                  <option value="Tehdit ve taciz">Tehdit ve taciz</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowReportModal(null)}
                className="px-4 py-2 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={handleExecuteReport}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Şikayeti İlet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
