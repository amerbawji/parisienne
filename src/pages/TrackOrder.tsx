import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

// Customer-friendly status copy
const STATUS_INFO: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
  new:       { label: 'Order received',   labelAr: 'تم استلام طلبك',   color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: '🕐' },
  confirmed: { label: 'Confirmed',         labelAr: 'تم تأكيد طلبك',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '✅' },
  preparing: { label: 'Being prepared',    labelAr: 'يتم التحضير',      color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '👨‍🍳' },
  ready:     { label: 'Ready for pickup',  labelAr: 'جاهز للاستلام',   color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎁' },
  delivered: { label: 'Delivered',         labelAr: 'تم التوصيل',       color: 'bg-green-50 text-green-700 border-green-200',  icon: '🎉' },
  cancelled: { label: 'Cancelled',         labelAr: 'تم الإلغاء',       color: 'bg-red-50 text-red-700 border-red-200',       icon: '❌' },
};

interface TrackItem {
  name_en: string;
  name_ar: string;
  quantity: number;
  price: number;
  unit: string;
  selected_options: Record<string, string>;
}

interface AdminNote {
  type: 'added' | 'removed' | 'qty_changed';
  name: string;
  qty?: number;
  from?: number;
  to?: number;
  at: string;
}

interface TrackOrder {
  id: string;
  created_at: string;
  status: string;
  service_type: string;
  payment_method: string | null;
  items: TrackItem[];
  total: number;
  timing: string | null;
  scheduled_time: string | null;
  order_number: number | null;
  admin_notes: AdminNote[] | null;
}

export const TrackOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const isAr = lang === 'ar';

  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [orderNum, setOrderNum] = useState(searchParams.get('order') ?? '');
  const preFilled = !!(searchParams.get('phone') && searchParams.get('order'));
  const [orders, setOrders] = useState<TrackOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fetchOrders = async (p: string, num: string) => {
    setLoading(true);
    setError(null);
    setSubmitted(true);

    // Verify phone + order number match before revealing any orders
    const { data: verifyData } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_phone', p.trim())
      .eq('order_number', Number(num.trim()))
      .single();

    if (!verifyData) {
      setLoading(false);
      setError(isAr ? 'لم نتمكن من إيجاد طلب بهذه المعلومات.' : "We couldn't find an order with those details.");
      setOrders(null);
      return;
    }

    // Verified — load all orders for this phone
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', p.trim())
      .order('created_at', { ascending: false })
      .limit(20);
    setLoading(false);
    if (fetchError) {
      setError(isAr ? 'حدث خطأ. يرجى المحاولة مجدداً.' : 'Something went wrong. Please try again.');
      return;
    }
    setOrders((data as TrackOrder[]) ?? []);
  };

  // Auto-fetch if both params pre-filled from URL
  useEffect(() => {
    const prePhone = searchParams.get('phone');
    const preOrder = searchParams.get('order');
    if (prePhone && preOrder) fetchOrders(prePhone, preOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One subscription per order — mirrors the pattern used in CartContent that works
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    const channels = orders.map((o) =>
      supabase
        .channel(`track-order-${o.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${o.id}` },
          (payload) => {
            const updated = payload.new as TrackOrder;
            setOrders((prev) =>
              prev
                ? prev.map((order) =>
                    order.id === updated.id
                      ? { ...order, status: updated.status ?? order.status, items: updated.items ?? order.items, total: updated.total ?? order.total, admin_notes: updated.admin_notes ?? order.admin_notes }
                      : order
                  )
                : prev
            );
          }
        )
        .subscribe()
    );
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [orders?.map((o) => o.id).join()]);

  // Polling fallback — silently refreshes order data every 8s in case realtime misses an event
  useEffect(() => {
    if (!orders || orders.length === 0 || !phone) return;
    const ids = orders.map((o) => o.id);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('id,status,items,total,admin_notes')
        .in('id', ids);
      if (data) {
        setOrders((prev) =>
          prev
            ? prev.map((o) => {
                const fresh = (data as TrackOrder[]).find((d) => d.id === o.id);
                return fresh ? { ...o, status: fresh.status, items: fresh.items, total: fresh.total, admin_notes: fresh.admin_notes } : o;
              })
            : prev
        );
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [orders?.map((o) => o.id).join(), phone]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !orderNum.trim()) return;
    fetchOrders(phone, orderNum);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const statusInfo = (status: string) =>
    STATUS_INFO[status] ?? { label: status, labelAr: status, color: 'bg-gray-50 text-gray-600 border-gray-200', icon: '•' };

  const handleReorder = (order: TrackOrder) => {
    order.items.forEach((item) => {
      addItem({
        id: crypto.randomUUID(),
        name: item.name_en || item.name_ar,
        name_en: item.name_en,
        name_ar: item.name_ar,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        selectedOptions: item.selected_options,
      });
    });
    setCartOpen(true);
    navigate('/');
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ fontFamily: isAr ? 'system-ui, sans-serif' : undefined }}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAr ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
            {isAr ? 'الرئيسية' : 'Home'}
          </button>

          <span className="text-sm font-bold text-gray-800 truncate">
            {isAr ? 'تتبع طلبك' : 'Track Your Order'}
          </span>

          <button
            type="button"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 font-medium shrink-0"
          >
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Logo / intro — only shown on cold visit */}
        {!preFilled && <div className="text-center flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ background: '#25568c' }}
          >
            🛍️
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {isAr ? 'تتبع طلبك' : 'Track Your Order'}
          </h1>
          <p className="text-sm text-gray-500 max-w-xs">
            {isAr
              ? 'أدخل رقم هاتفك ورقم طلبك للاطلاع على طلباتك.'
              : 'Enter your phone number and order number to view your orders.'}
          </p>
        </div>}

        {/* Search form — hidden when pre-filled from URL */}
        {!preFilled && <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              {isAr ? 'رقم الهاتف' : 'Phone number'}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setOrders(null); }}
              placeholder={isAr ? 'مثال: 96170000000' : 'e.g. 96170000000'}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              {isAr ? 'رقم الطلب' : 'Order number'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={orderNum}
              onChange={(e) => { setOrderNum(e.target.value.replace(/\D/g, '')); setOrders(null); }}
              placeholder={isAr ? 'مثال: 1001' : 'e.g. 1001'}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !phone.trim() || !orderNum.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: '#25568c' }}
          >
            {loading ? '...' : (isAr ? 'بحث' : 'Track')}
          </button>
        </form>}

        {/* Loading spinner when pre-filled */}
        {preFilled && loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        )}
        {preFilled && error && (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {submitted && !loading && orders !== null && (
          orders.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <span className="text-4xl">🔍</span>
              <p className="text-gray-500 text-sm">
                {isAr
                  ? 'لا توجد طلبات مرتبطة بهذا الرقم.'
                  : 'No orders found for this number.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {isAr
                  ? `${orders.length} طلب`
                  : `${orders.length} order${orders.length !== 1 ? 's' : ''} found`}
              </p>
              {orders.map((order) => {
                const si = statusInfo(order.status);
                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
                      <div className="flex flex-col">
                        {order.order_number != null && (
                          <span className="text-xs font-bold text-primary-600">#{order.order_number}</span>
                        )}
                        <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${si.color}`}>
                        <span>{si.icon}</span>
                        <span>{isAr ? si.labelAr : si.label}</span>
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="px-4 py-3 flex flex-col gap-3">
                      {/* Service + payment */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                        <span className="capitalize font-medium text-gray-700">
                          {order.service_type === 'delivery'
                            ? (isAr ? 'توصيل' : 'Delivery')
                            : (isAr ? 'استلام' : 'Takeaway')}
                        </span>
                        {order.payment_method && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="capitalize">
                              {isAr
                                ? (order.payment_method === 'cash' ? 'نقداً' : order.payment_method === 'card' ? 'بطاقة' : order.payment_method)
                                : order.payment_method}
                            </span>
                          </>
                        )}
                        {order.timing === 'scheduled' && order.scheduled_time && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>
                              {isAr ? `مجدول: ${order.scheduled_time}` : `Scheduled: ${order.scheduled_time}`}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-2 text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900">
                                {isAr ? (item.name_ar || item.name_en) : item.name_en}
                              </span>
                              {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0 text-sm">
                              <span className="text-gray-400">×{item.quantity}</span>
                              <span className="ml-2 font-semibold text-gray-800">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Store changes */}
                      {order.admin_notes && order.admin_notes.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                            {isAr ? 'تعديلات من المتجر' : 'Updated by store'}
                          </p>
                          {order.admin_notes.map((note, i) => {
                            let msg = '';
                            if (note.type === 'added') msg = isAr ? `تمت إضافة: ${note.name}${note.qty && note.qty > 1 ? ` ×${note.qty}` : ''}` : `Added: ${note.name}${note.qty && note.qty > 1 ? ` ×${note.qty}` : ''}`;
                            else if (note.type === 'removed') msg = isAr ? `تمت إزالة: ${note.name}` : `Removed: ${note.name}`;
                            else if (note.type === 'qty_changed') msg = isAr ? `تعديل الكمية: ${note.name} من ${note.from} إلى ${note.to}` : `Qty changed: ${note.name} — ${note.from} → ${note.to}`;
                            return (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                                <span className="mt-0.5 shrink-0">•</span>
                                <span>{msg}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Total + Reorder */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 text-sm font-bold text-gray-900">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 font-normal">{isAr ? 'المجموع' : 'Total'}</span>
                          <span className="ms-1">${Number(order.total).toFixed(2)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-90 active:scale-95"
                          style={{ background: '#25568c' }}
                        >
                          🔁 {isAr ? 'أعد الطلب' : 'Reorder'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        Parisienne
      </footer>
    </div>
  );
};
