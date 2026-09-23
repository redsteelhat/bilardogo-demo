import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Video,
  Reply,
  ShieldAlert,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  Search,
  MoreVertical,
  X,
  CheckCircle2,
  Lock,
  Flag,
  Play,
  Film,
  Smile,
  Globe,
  MapPin,
  Store,
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
    friends,
    blockedUsers,
    toggleFriend,
    toggleBlockUser,
    reportUserOrMessage,
    showToast,
  } = useApp();

  const [activeChannel, setActiveChannel] = useState<string>('turkiye');
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Media dialog states
  const [showMediaModal, setShowMediaModal] = useState<'PHOTO' | 'VIDEO' | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');

  // User detail / action modal
  const [inspectedUser, setInspectedUser] = useState<User | null>(null);

  // Report modal
  const [reportingTarget, setReportingTarget] = useState<{
    targetUserId: string;
    targetUserName: string;
    messageId?: string;
    messageText?: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('Uygunsuz dil, hakaret veya taciz');

  const currentSalon = salons.find(s => s.id === currentUser.currentSalonId) || salons[0];
  const allOtherUsers = users.filter(u => u.id !== currentUser.id);

  // Filter messages based on active channel and blocked users
  const currentChannelMessages = chatMessages.filter(m => {
    // If sender is blocked by currentUser, hide message unless currentUser sent it
    if (blockedUsers.includes(m.senderId) && m.senderId !== currentUser.id) {
      return false;
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
      replyingTo?.id,
      undefined,
      replyingTo?.text,
      replyingTo?.senderName
    );

    setInputText('');
    setReplyingTo(null);
  };

  const handleSendMedia = () => {
    if (!mediaUrlInput.trim()) {
      showToast('Lütfen geçerli bir bağlantı girin.');
      return;
    }

    if (showMediaModal === 'PHOTO') {
      sendMessage(
        activeChannel,
        mediaCaption.trim() || 'Fotoğraf paylaştı 🎱',
        mediaUrlInput.trim(),
        replyingTo?.id,
        undefined,
        replyingTo?.text,
        replyingTo?.senderName
      );
    } else {
      sendMessage(
        activeChannel,
        mediaCaption.trim() || 'Bilardo vuruş videosu 🎥',
        undefined,
        replyingTo?.id,
        mediaUrlInput.trim(),
        replyingTo?.text,
        replyingTo?.senderName
      );
    }

    setShowMediaModal(null);
    setMediaUrlInput('');
    setMediaCaption('');
    setReplyingTo(null);
  };

  const handleExecuteReport = () => {
    if (!reportingTarget) return;
    reportUserOrMessage(
      reportingTarget.targetUserId,
      reportingTarget.messageId ? 'MESAJ' : 'KULLANICI',
      reportingTarget.messageId || reportingTarget.targetUserId,
      reportingTarget.messageText || `Kullanıcı: ${reportingTarget.targetUserName}`,
      reportReason
    );
    showToast('Şikayetiniz moderasyon ekibine iletildi.');
    setReportingTarget(null);
    setReportReason('Uygunsuz dil, hakaret veya taciz');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Sosyal Topluluk & Sohbet
          </h2>
          <p className="text-xs text-neutral-400">
            Genel, şehir, salon sohbetleri ve birebir özel mesajlaşma alanı.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Özel mesajlar gizlidir, yalnızca şikayet halinde moderasyona açılır.</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[670px] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Left Sidebar: Channels & Friends */}
        <div className="p-3.5 border-r border-neutral-800 flex flex-col justify-between bg-neutral-950/70 overflow-y-auto space-y-4">
          <div className="space-y-4">
            
            {/* 1. Sohbet Kanalları */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase px-2 tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Sohbet Odaları</span>
              </div>

              <button
                onClick={() => setActiveChannel('turkiye')}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
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
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                  activeChannel === `sehir_${selectedCity}`
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <span>📍 {selectedCity} Sohbeti</span>
                <span className="text-[10px] opacity-75">Şehir</span>
              </button>

              <button
                onClick={() => setActiveChannel(`salon_${currentSalon.id}`)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                  activeChannel === `salon_${currentSalon.id}`
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <span className="truncate">🎱 {currentSalon.name}</span>
                <span className="text-[10px] opacity-75">Salon</span>
              </button>
            </div>

            {/* 2. Özel Mesajlaşma (DM) */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase px-2 tracking-wider flex items-center justify-between">
                <span>Özel Mesajlar (DM)</span>
                <span className="text-[10px] text-amber-400 font-semibold">{friends.length} Arkadaş</span>
              </div>

              {allOtherUsers.map(u => {
                const dmChannelId = `dm_${[currentUser.id, u.id].sort().join('_')}`;
                const isFriend = friends.includes(u.id);
                const isBlocked = blockedUsers.includes(u.id);

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      activeChannel === dmChannelId
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                        : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <button
                      onClick={() => setActiveChannel(dmChannelId)}
                      className="flex items-center gap-2 flex-1 text-left truncate"
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-7 h-7 rounded-lg object-cover border border-neutral-700"
                      />
                      <div className="truncate flex-1">
                        <div className="text-xs font-semibold truncate flex items-center gap-1">
                          <span>{u.name}</span>
                          {isFriend && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Arkadaşınız" />
                          )}
                        </div>
                        <div className="text-[10px] opacity-70 truncate">
                          {isBlocked ? 'Engellendi' : u.level}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setInspectedUser(u);
                      }}
                      className="p-1 rounded-lg hover:bg-black/20 text-neutral-400"
                      title="Kullanıcı Detayı"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Blocked Count Badge */}
          {blockedUsers.length > 0 && (
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Engellenen Kullanıcılar</span>
              <span className="font-bold text-red-400">{blockedUsers.length}</span>
            </div>
          )}
        </div>

        {/* Right Chat Area */}
        <div className="col-span-2 flex flex-col justify-between h-full bg-neutral-900">
          
          {/* Channel Bar */}
          <div className="px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm text-white">
                {activeChannel === 'turkiye'
                  ? '🇹🇷 Türkiye Sohbeti'
                  : activeChannel.startsWith('sehir_')
                  ? `📍 ${selectedCity} Sohbet Odası`
                  : activeChannel.startsWith('salon_')
                  ? `🎱 ${currentSalon.name} Sohbeti`
                  : 'Özel Birebir Sohbet (DM)'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                Canlı Akış
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => {
                  setShowMediaModal('PHOTO');
                  setMediaUrlInput('https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&w=800&q=80');
                }}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="Fotoğraf Paylaş"
              >
                <ImageIcon className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => {
                  setShowMediaModal('VIDEO');
                  setMediaUrlInput('https://assets.mixkit.co/videos/preview/mixkit-playing-a-game-of-pool-42861-large.mp4');
                }}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="Video Paylaş"
              >
                <Video className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {currentChannelMessages.map(msg => {
              const isMine = msg.senderId === currentUser.id;
              const senderUser = users.find(u => u.id === msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {/* Reply Reference Quote */}
                  {msg.replyToText && (
                    <div className="text-[11px] text-neutral-400 mb-1 px-2.5 py-1 rounded-lg bg-neutral-950/70 border border-neutral-800 max-w-sm truncate">
                      <span className="text-amber-400 font-bold">↳ {msg.replyToSenderName || 'Yanıtlanan'}:</span>{' '}
                      {msg.replyToText}
                    </div>
                  )}

                  <div className={`flex items-end gap-2 max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <button
                        onClick={() => senderUser && setInspectedUser(senderUser)}
                        className="shrink-0 mb-1"
                        title="Profili Gör / Arkadaş Ekle"
                      >
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          className="w-7 h-7 rounded-xl object-cover hover:border hover:border-amber-400 transition-all"
                        />
                      </button>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl text-xs space-y-1.5 shadow-md ${
                        isMine
                          ? 'bg-amber-500 text-neutral-950 rounded-br-none font-medium'
                          : 'bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-bl-none'
                      }`}
                    >
                      {!isMine && (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => senderUser && setInspectedUser(senderUser)}
                            className="font-bold text-[11px] text-amber-400 hover:underline"
                          >
                            {msg.senderName}
                          </button>
                          {friends.includes(msg.senderId) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              Arkadaş
                            </span>
                          )}
                        </div>
                      )}

                      <p className="leading-relaxed break-words">{msg.text}</p>

                      {/* Photo preview */}
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Görsel"
                          className="w-full max-h-52 rounded-xl object-cover mt-2 border border-black/20"
                        />
                      )}

                      {/* Video player */}
                      {msg.videoUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-black/20">
                          <video
                            src={msg.videoUrl}
                            controls
                            className="w-full max-h-52 object-cover"
                          />
                        </div>
                      )}

                      <div className={`text-[9px] text-right pt-0.5 ${isMine ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>
                        {msg.createdAt}
                      </div>
                    </div>

                    {/* Quick message hover actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        title="Mesajı Yanıtla"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      {!isMine && (
                        <button
                          onClick={() => setReportingTarget({
                            targetUserId: msg.senderId,
                            targetUserName: msg.senderName,
                            messageId: msg.id,
                            messageText: msg.text,
                          })}
                          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                          title="Mesajı Şikayet Et"
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
                <MessageSquare className="w-8 h-8 opacity-40 text-amber-500" />
                <p className="text-xs">Bu kanalda henüz mesaj yok. İlk mesajı siz yazın!</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-neutral-950/90 border-t border-neutral-800 space-y-2">
            {/* Replying Notice */}
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 rounded-xl text-xs text-neutral-300">
                <div className="truncate flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-bold">{replyingTo.senderName}</span> yanıtlanıyor: {replyingTo.text}
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-neutral-500 hover:text-white ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMediaModal('PHOTO');
                  setMediaUrlInput('https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&w=800&q=80');
                }}
                className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-neutral-700 transition-colors"
                title="Fotoğraf Ekle"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMediaModal('VIDEO');
                  setMediaUrlInput('https://assets.mixkit.co/videos/preview/mixkit-playing-a-game-of-pool-42861-large.mp4');
                }}
                className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-blue-400 hover:border-neutral-700 transition-colors"
                title="Video Ekle"
              >
                <Video className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder="Bir mesaj yazın... (Enter ile gönder)"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-amber-500 transition-colors"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 transition-all font-bold shadow-md shadow-amber-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* User Details & Social Actions Modal */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={inspectedUser.avatar}
                  alt={inspectedUser.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-neutral-700"
                />
                <div>
                  <h3 className="font-bold text-base text-white">{inspectedUser.name}</h3>
                  <p className="text-xs text-neutral-400">@{inspectedUser.username}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-block mt-1">
                    {inspectedUser.level}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setInspectedUser(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
              <div className="flex justify-between text-neutral-400">
                <span>Şehir:</span>
                <span className="text-white font-medium">{inspectedUser.city}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>3 Bant Ort:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {inspectedUser.stats.threeCushion.generalAverage.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Toplam Maç:</span>
                <span className="text-white font-medium">{inspectedUser.stats.totalMatches}</span>
              </div>
            </div>

            {/* Social Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
              {/* Arkadaş Ekle / Çıkar */}
              <button
                onClick={() => {
                  toggleFriend(inspectedUser.id);
                  setInspectedUser(null);
                }}
                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  friends.includes(inspectedUser.id)
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                }`}
              >
                {friends.includes(inspectedUser.id) ? (
                  <>
                    <UserX className="w-4 h-4" />
                    <span>Arkadaşlıktan Çıkar</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Arkadaş Olarak Ekle</span>
                  </>
                )}
              </button>

              {/* Kullanıcıyı Engelle */}
              <button
                onClick={() => {
                  toggleBlockUser(inspectedUser.id);
                  setInspectedUser(null);
                }}
                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                  blockedUsers.includes(inspectedUser.id)
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                    : 'bg-neutral-900 border-red-500/30 text-red-400 hover:bg-red-500/10'
                }`}
              >
                <UserX className="w-4 h-4" />
                <span>
                  {blockedUsers.includes(inspectedUser.id) ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}
                </span>
              </button>

              {/* Kullanıcıyı Şikayet Et */}
              <button
                onClick={() => {
                  setReportingTarget({
                    targetUserId: inspectedUser.id,
                    targetUserName: inspectedUser.name,
                  });
                  setInspectedUser(null);
                }}
                className="w-full py-2 text-neutral-500 hover:text-red-400 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Kullanıcıyı Moderasyona Şikayet Et</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Upload Simulation Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                {showMediaModal === 'PHOTO' ? <ImageIcon className="w-4 h-4 text-amber-500" /> : <Video className="w-4 h-4 text-blue-500" />}
                {showMediaModal === 'PHOTO' ? 'Fotoğraf Paylaşımı' : 'Video Paylaşımı'}
              </h3>
              <button onClick={() => setShowMediaModal(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Medya URL / Dosya Bağlantısı</label>
                <input
                  type="url"
                  value={mediaUrlInput}
                  onChange={e => setMediaUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Açıklama (İsteğe bağlı)</label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={e => setMediaCaption(e.target.value)}
                  placeholder="Örn: 14 sayılık harika seri vuruşu..."
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Live Preview */}
              {mediaUrlInput && (
                <div className="rounded-xl overflow-hidden border border-neutral-800 max-h-40">
                  {showMediaModal === 'PHOTO' ? (
                    <img src={mediaUrlInput} alt="Önizleme" className="w-full h-40 object-cover" />
                  ) : (
                    <video src={mediaUrlInput} className="w-full h-40 object-cover" />
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSendMedia}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              Sohbette Paylaş
            </button>
          </div>
        </div>
      )}

      {/* Reporting Modal */}
      {reportingTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Moderasyona Şikayet Et
              </h3>
              <button onClick={() => setReportingTarget(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="text-neutral-400">Şikayet Edilen:</div>
                <div className="font-bold text-white mt-0.5">{reportingTarget.targetUserName}</div>
                {reportingTarget.messageText && (
                  <div className="mt-1.5 pt-1.5 border-t border-neutral-800 text-[11px] text-neutral-400">
                    Mesaj: "{reportingTarget.messageText}"
                  </div>
                )}
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Şikayet Sebebi</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Uygunsuz dil, hakaret veya taciz">Uygunsuz dil, hakaret veya taciz</option>
                  <option value="Yanıltıcı / Sahte skor ve ortalama beyanı">Yanıltıcı / Sahte skor ve ortalama beyanı</option>
                  <option value="Spam veya reklam içeriği">Spam veya reklam içeriği</option>
                  <option value="Telif hakkı ihlali veya yasa dışı içerik">Telif hakkı ihlali veya yasa dışı içerik</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div className="text-[11px] text-neutral-500 leading-relaxed">
                Şikayetiniz gizli tutulacak olup moderasyon heyeti tarafından log kayıtlarıyla incelenecektir.
              </div>
            </div>

            <button
              onClick={handleExecuteReport}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all"
            >
              Şikayeti Onayla ve Gönder
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
