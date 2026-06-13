import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLastOrderStore } from '../store/lastOrderStore';

const STATUS_INFO: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
  new:       { label: 'Order received',   labelAr: 'تم استلام طلبك',   color: 'bg-blue-50 text-blue-700 border-blue-200',     icon: '🕐' },
  confirmed: { label: 'Confirmed',         labelAr: 'تم تأكيد طلبك',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '✅' },
  preparing: { label: 'Being prepared',    labelAr: 'يتم التحضير',      color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '👨‍🍳' },
  ready:     { label: 'Ready for pickup',  labelAr: 'جاهز للاستلام',   color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎁' },
  delivered: { label: 'Delivered',         labelAr: 'تم التوصيل',       color: 'bg-green-50 text-green-700 border-green-200',   icon: '🎉' },
  cancelled: { label: 'Cancelled',         labelAr: 'تم الإلغاء',       color: 'bg-red-50 text-red-700 border-red-200',         icon: '❌' },
};

const DONE = ['delivered', 'cancelled'];

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
  const clearTracking = useLastOrderStore((s) => s.clearTracking);

  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const isAr = lang === 'ar';

  const urlPhone = searchParams.get('phone') ?? '';
  const urlOrder = searchParams.get('order') ?? '';
  const preFilled = !!urlPhone;

  const [phone, setPhone] = useState(urlPhone);
  const [orderNum, setOrderNum] = useState(urlOrder);
  const [orders, setOrders] = useState<TrackOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = (p: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    pollInterval.current = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', p)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setOrders(data as TrackOrder[]);
    }, 5000);
  };

  useEffect(() => { return () => { if (pollInterval.current) clearInterval(pollInterval.current); }; }, []);

  const fetchOrders = async (p: string, num: string) => {
    setLoading(true);
    setError(null);
    setSubmitted(true);

    // Verify: if order number provided, check it matches; otherwise just check phone has orders
    if (num.trim()) {
      const { data: verifyData } = await supabase
        .from('orders').select('id')
        .eq('customer_phone', p.trim())
        .eq('order_number', Number(num.trim()))
        .single();
      if (!verifyData) {
        setLoading(false);
        setError(isAr ? 'لم نتمكن من إيجاد طلب بهذه المعلومات.' : "We couldn't find an order with those details.");
        setOrders(null);
        return;
      }
    }

    const { data, error: fetchError } = await supabase
      .from('orders').select('*')
      .eq('customer_phone', p.trim())
      .order('created_at', { ascending: false })
      .limit(20);
    setLoading(false);
    if (fetchError || !data || data.length === 0) {
      setError(isAr ? 'لم نتمكن من إيجاد طلب بهذه المعلومات.' : "We couldn't find an order with those details.");
      setOrders(null);
      return;
    }
    setOrders(data as TrackOrder[]);
    startPolling(p.trim());
  };

  useEffect(() => {
    if (urlPhone) fetchOrders(urlPhone, urlOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !orderNum.trim()) return;
    fetchOrders(phone, orderNum);
  };

  const handleDismiss = () => {
    clearTracking();
    navigate('/');
  };

  // Derive the single order to display: most recent non-done, or most recent if all done
  const currentOrder = orders
    ? (orders.find((o) => !DONE.includes(o.status)) ?? orders[0])
    : null;
  const isDone = currentOrder ? DONE.includes(currentOrder.status) : false;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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

        {/* Manual entry form — hidden when phone pre-filled from URL */}
        {!preFilled && (
          <>
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ background: '#25568c' }}>
                🛍️
              </div>
              <h1 className="text-xl font-bold text-gray-900">{isAr ? 'تتبع طلبك' : 'Track Your Order'}</h1>
              <p className="text-sm text-gray-500 max-w-xs">
                {isAr ? 'أدخل رقم هاتفك ورقم طلبك.' : 'Enter your phone number and order number.'}
              </p>
            </div>

            <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">{isAr ? 'رقم الهاتف' : 'Phone number'}</label>
                <input
                  type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setOrders(null); }}
                  placeholder={isAr ? 'مثال: 96170000000' : 'e.g. 96170000000'}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">{isAr ? 'رقم الطلب' : 'Order number'}</label>
                <input
                  type="text" inputMode="numeric" value={orderNum}
                  onChange={(e) => { setOrderNum(e.target.value.replace(/\D/g, '')); setOrders(null); }}
                  placeholder={isAr ? 'مثال: 1001' : 'e.g. 1001'}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit" disabled={loading || !phone.trim() || !orderNum.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: '#25568c' }}
              >
                {loading ? '...' : (isAr ? 'بحث' : 'Track')}
              </button>
            </form>
          </>
        )}

        {/* Loading */}
        {preFilled && loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && preFilled && (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {/* Current order card */}
        {submitted && !loading && currentOrder && (() => {
          const si = STATUS_INFO[currentOrder.status] ?? { label: currentOrder.status, labelAr: currentOrder.status, color: 'bg-gray-50 text-gray-600 border-gray-200', icon: '•' };
          return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
                <div className="flex flex-col">
                  {currentOrder.order_number != null && (
                    <span className="text-xs font-bold text-primary-600">#{currentOrder.order_number}</span>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(currentOrder.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${si.color}`}>
                    <span>{si.icon}</span>
                    <span>{isAr ? si.labelAr : si.label}</span>
                  </span>
                  {isDone && (
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="text-gray-400 hover:text-gray-700 transition p-1"
                      aria-label="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 flex flex-col gap-3">
                {/* Service + payment */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                  <span className="capitalize font-medium text-gray-700">
                    {currentOrder.service_type === 'delivery' ? (isAr ? 'توصيل' : 'Delivery') : (isAr ? 'استلام' : 'Takeaway')}
                  </span>
                  {currentOrder.payment_method && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="capitalize">
                        {isAr
                          ? (currentOrder.payment_method === 'cash' ? 'نقداً' : currentOrder.payment_method === 'card' ? 'بطاقة' : currentOrder.payment_method)
                          : currentOrder.payment_method}
                      </span>
                    </>
                  )}
                  {currentOrder.timing === 'scheduled' && currentOrder.scheduled_time && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>{isAr ? `مجدول: ${currentOrder.scheduled_time}` : `Scheduled: ${currentOrder.scheduled_time}`}</span>
                    </>
                  )}
                </div>

                {/* Items */}
                <div className="flex flex-col gap-1.5">
                  {currentOrder.items.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900">{isAr ? (item.name_ar || item.name_en) : item.name_en}</span>
                        {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-sm">
                        <span className="text-gray-400">×{item.quantity}</span>
                        <span className="ml-2 font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Store changes */}
                {currentOrder.admin_notes && currentOrder.admin_notes.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      {isAr ? 'تعديلات من المتجر' : 'Updated by store'}
                    </p>
                    {currentOrder.admin_notes.map((note, i) => {
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

                {/* Total */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-1 text-sm font-bold text-gray-900">
                  <span className="text-gray-500 font-normal">{isAr ? 'المجموع' : 'Total'}</span>
                  <span className="ms-1">${Number(currentOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">Parisienne</footer>
    </div>
  );
};
