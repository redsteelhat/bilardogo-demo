import React, { useState } from 'react';
import {
  Utensils,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  Clock,
  MapPin,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CafeMenuItem } from '../../types';

export const OrderFoodView: React.FC = () => {
  const {
    currentUser,
    salons,
    cafeOrders,
    placeCafeOrder,
    setActiveView,
    showToast,
  } = useApp();

  const currentSalon = salons.find(s => s.id === currentUser.currentSalonId) || salons[0];
  const [selectedCategory, setSelectedCategory] = useState<string>('SICAK_ICECEK');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [orderNote, setOrderNote] = useState('');
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  const categories = [
    { key: 'SICAK_ICECEK', label: 'Sıcak İçecekler' },
    { key: 'SOGUK_ICECEK', label: 'Soğuk İçecekler' },
    { key: 'YIYECEK', label: 'Tost & Atıştırmalık' },
  ];

  const cafeMenu = currentSalon.cafeMenu || currentSalon.menuItems || [];
  const filteredItems = cafeMenu.filter(item => {
    if (selectedCategory === 'SICAK_ICECEK') return item.category.toLowerCase().includes('sicak');
    if (selectedCategory === 'SOGUK_ICECEK') return item.category.toLowerCase().includes('soguk');
    return item.category.toLowerCase().includes('yiyecek') || item.category.toLowerCase().includes('atistirmalik');
  });

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const totalItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = cafeMenu.find(m => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handlePlaceOrder = () => {
    if (totalItemsCount === 0) {
      showToast('Lütfen en az bir ürün seçiniz.');
      return;
    }

    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const menuItem = cafeMenu.find(m => m.id === id)!;
      return {
        menuItemId: id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
      };
    });

    placeCafeOrder({
      salonId: currentSalon.id,
      userId: currentUser.id,
      userName: currentUser.name,
      tableNumber: selectedTableNumber,
      items: orderItems,
      totalAmount: totalPrice,
      note: orderNote.trim() || undefined,
    });

    setCart({});
    setOrderNote('');
    setShowCheckoutSuccess(true);
  };

  // My active orders in this salon
  const myOrders = cafeOrders.filter(o => o.userId === currentUser.id || o.customerId === currentUser.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold">
              Kafeterya & Bar
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {currentSalon.name}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display">
            Masaya Sipariş Ver
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Maçınızı bölmeden masanıza çay, kahve veya tost siparişi verin; salon personeli masanıza getirsin.
          </p>
        </div>

        {/* Table selector for order destination */}
        <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center gap-3">
          <div className="text-xs">
            <div className="text-neutral-500 text-[10px] uppercase font-bold">Hedef Masa</div>
            <div className="text-white font-bold">Masa {selectedTableNumber}</div>
          </div>
          <select
            value={selectedTableNumber}
            onChange={e => setSelectedTableNumber(Number(e.target.value))}
            className="bg-neutral-900 border border-neutral-700 text-xs rounded-xl p-2 text-white"
          >
            {currentSalon.tables.map(t => (
              <option key={t.tableNumber} value={t.tableNumber}>
                Masa {t.tableNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Categories & Menu Items */}
        <div className="md:col-span-2 space-y-5">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat.key
                    ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const qty = cart[item.id] || 0;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                    <span className="text-xs font-extrabold text-amber-400 mt-0.5 block">
                      {item.price} ₺
                    </span>
                  </div>

                  {/* Add / Remove quantity controls */}
                  <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
                    {qty > 0 ? (
                      <>
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-amber-400">
                          {qty}
                        </span>
                      </>
                    ) : null}
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-neutral-950 font-bold shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Past / Ongoing Orders Strip */}
          {myOrders.length > 0 && (
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Sipariş Geçmişim & Durum
              </h3>
              <div className="space-y-2">
                {myOrders.map(ord => (
                  <div
                    key={ord.id}
                    className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">Masa {ord.tableNumber}</span>
                      <span className="text-neutral-500 mx-1.5">•</span>
                      <span className="text-neutral-400">
                        {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400">{ord.totalAmount || ord.totalPrice} ₺</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'SERVIS_EDILDI' || ord.status === 'TESLIM_EDILDI'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400 animate-pulse'
                        }`}
                      >
                        {ord.status === 'SERVIS_EDILDI' || ord.status === 'TESLIM_EDILDI' ? 'Teslim Edildi' : 'Hazırlanıyor'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Basket & Checkout */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Sipariş Özeti
              </h3>
              <span className="text-xs text-neutral-400">{totalItemsCount} Ürün</span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto text-xs">
              {Object.entries(cart).map(([id, qty]) => {
                const item = cafeMenu.find(m => m.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{item.name}</span>
                      <span className="text-neutral-500 text-[11px] block">{qty} x {item.price} ₺</span>
                    </div>
                    <span className="font-bold text-neutral-200">{qty * item.price} ₺</span>
                  </div>
                );
              })}

              {totalItemsCount === 0 && (
                <div className="py-8 text-center text-xs text-neutral-500">
                  Sepetiniz şu an boş.
                </div>
              )}
            </div>

            {/* Order Note */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <label className="text-[11px] font-semibold text-neutral-400 block">Sipariş Notu</label>
              <input
                type="text"
                placeholder="Örn: Çay açık olsun, şekersiz..."
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Total Calculation */}
            <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Teslimat Yeri:</span>
                <span className="font-bold text-white">Masa {selectedTableNumber}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Ödeme Şekli:</span>
                <span className="font-bold text-emerald-400">Masada / Kasada Ödeme</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-neutral-800">
                <span>Toplam Tutar:</span>
                <span className="text-amber-400 text-base">{totalPrice} ₺</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={totalItemsCount === 0}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Utensils className="w-4 h-4" />
              <span>Siparişi Masaya Gönder</span>
            </button>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl text-neutral-100">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-white">Siparişiniz Alındı!</h4>
            <p className="text-xs text-neutral-400">
              Siparişiniz Masa {selectedTableNumber} için kafeterya personeline iletildi. En kısa sürede masanıza ulaştırılacaktır.
            </p>
            <button
              onClick={() => setShowCheckoutSuccess(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
