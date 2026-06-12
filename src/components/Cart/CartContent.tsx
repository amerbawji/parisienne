import { useState, useEffect } from 'react';
import type { CartItem } from '../../store/cartStore';

const SAVED_DETAILS_KEY = 'parisienne_saved_details';
import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cartStore';
import { useLanguageStore } from '../../store/languageStore';
import { CartItemRow } from './CartItemRow';
import { Button } from '../UI/Button';
import { generateWhatsAppLink } from '../../utils/whatsapp';
import { cn } from '../../utils/cn';
import { supabase } from '../../lib/supabase';
import { useStoreConfigStore } from '../../store/storeConfigStore';
import { useLastOrderStore } from '../../store/lastOrderStore';
import { useMenuStore } from '../../store/menuStore';

const OptionButton = ({ 
  selected, 
  onClick, 
  children 
}: { 
  selected: boolean; 
  onClick: () => void; 
  children: React.ReactNode 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all duration-200",
      selected 
        ? "bg-primary-500 text-white border-primary-500 shadow-sm" 
        : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:bg-primary-50"
    )}
  >
    {children}
  </button>
);

export const CartContent = () => {
  const { items, getTotalItems, clearCart, setCartOpen } = useCartStore();
  const menuCategories = useMenuStore((s) => s.categories);
  const allMenuItems = menuCategories.flatMap((c) => c.items);
  const saveLastOrder = useLastOrderStore((s) => s.saveOrder);
  const lastOrderItems = useLastOrderStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const { t, language } = useLanguageStore();
  const storeIsOpen = useStoreConfigStore((s) => s.isOpen());
  const whatsappNumber = useStoreConfigStore((s) => s.whatsapp_number);
  const whatsappEnabled = useStoreConfigStore((s) => s.whatsapp_enabled);
  const discountPct = useStoreConfigStore((s) => s.discount_percentage);
  const openTime = useStoreConfigStore((s) => s.open_time);
  const closeTime = useStoreConfigStore((s) => s.close_time);
  const closedDays = useStoreConfigStore((s) => s.closed_days);
  const navigate = useNavigate();
  const totalItems = getTotalItems();
  const hasWeightBasedItem = items.some((item) => (item.step ?? 1) < 1 || (item.minQuantity ?? 1) < 1);

  const [serviceType, setServiceType] = useState<'takeaway' | 'delivery'>('delivery');
  const itemsTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = serviceType === 'delivery' ? 1.5 : 0;
  const totalPrice = itemsTotal + deliveryFee;
  const originalSubtotal = discountPct > 0 ? itemsTotal / (1 - discountPct / 100) : itemsTotal;
  const discountAmount = originalSubtotal - itemsTotal;
  const [timing, setTiming] = useState<'now' | 'scheduled'>(() => storeIsOpen ? 'now' : 'scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTimeOfDay, setScheduledTimeOfDay] = useState('');
  const scheduledTime = scheduledDate && scheduledTimeOfDay ? `${scheduledDate}T${scheduledTimeOfDay}` : '';
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [locationUrl, setLocationUrl] = useState('');
  const [locationPreviewUrl, setLocationPreviewUrl] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryBuilding, setDeliveryBuilding] = useState('');
  const [deliveryFloor, setDeliveryFloor] = useState('');
  const [deliveryDetails, setDeliveryDetails] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [error, setError] = useState('');
  const [saveDetails, setSaveDetails] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState<number | null>(null);

  interface PlacedOrder {
    id: string | null;
    orderNumber: number | null;
    items: CartItem[];
    total: number;
    serviceType: 'takeaway' | 'delivery';
    customerName: string;
    customerPhone: string;
  }
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [placedOrderStatus, setPlacedOrderStatus] = useState('new');
  const [showTracking, setShowTracking] = useState(false);
  const [trackingOrders, setTrackingOrders] = useState<{ id: string; created_at: string; status: string; service_type: string; order_number: number | null; items: { name_en: string; name_ar: string; quantity: number; price: number; unit: string; selected_options: Record<string, string> }[]; total: number }[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!storeIsOpen && timing === 'now') setTiming('scheduled');
  }, [storeIsOpen]);

  useEffect(() => {
    if (!placedOrder?.id) return;
    setPlacedOrderStatus('new');
    // Fetch current status in case it already changed
    supabase.from('orders').select('status').eq('id', placedOrder.id).single()
      .then(({ data }) => { if (data) setPlacedOrderStatus(data.status); });
    // Subscribe to live status updates
    const channel = supabase
      .channel(`placed-order-${placedOrder.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${placedOrder.id}` },
        (payload) => { setPlacedOrderStatus((payload.new as { status: string }).status); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [placedOrder?.id]);

  const isScheduledTimeValid = (value: string): boolean => {
    if (!value) return false;
    const d = new Date(value);
    if (closedDays.includes(d.getDay())) return false;
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    const openMins  = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    const mins = d.getHours() * 60 + d.getMinutes();
    if (closeMins <= openMins) return mins >= openMins || mins < closeMins;
    return mins >= openMins && mins < closeMins;
  };

  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const nowTimeLocal = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  const isPastDate = scheduledDate ? scheduledDate < todayLocal : false;

  const isClosedDay = scheduledDate && !isPastDate
    ? closedDays.includes(new Date(scheduledDate + 'T12:00:00').getDay())
    : false;


  useEffect(() => {
    const saved = localStorage.getItem(SAVED_DETAILS_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (d.customerName) setCustomerName(d.customerName);
      if (d.customerPhone) setCustomerPhone(d.customerPhone);
      if (d.deliveryArea) setDeliveryArea(d.deliveryArea);
      if (d.deliveryStreet) setDeliveryStreet(d.deliveryStreet);
      if (d.deliveryBuilding) setDeliveryBuilding(d.deliveryBuilding);
      if (d.deliveryFloor) setDeliveryFloor(d.deliveryFloor);
      if (d.deliveryDetails) setDeliveryDetails(d.deliveryDetails);
    } catch {
      // corrupted storage — ignore
    }
  }, []);

  const clearLocationData = () => {
    setLocationUrl('');
    setLocationPreviewUrl('');
    setLocationQuery('');
    setLocationCoordinates('');
    setDeliveryArea('');
    setDeliveryStreet('');
    setDeliveryBuilding('');
    setDeliveryFloor('');
    setDeliveryDetails('');
    setLocationStatus('');
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus(t('location_not_supported'));
      return;
    }

    setIsFetchingLocation(true);
    setLocationStatus('');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const previewUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        const query = `${latitude},${longitude}`;

        setLocationUrl(mapUrl);
        setLocationPreviewUrl(previewUrl);
        setLocationQuery(query);
        setLocationCoordinates(coords);
        setDeliveryArea('');
        setDeliveryStreet(coords);
        setDeliveryBuilding('');
        setDeliveryFloor('');
        setLocationStatus(t('location_captured'));
        setIsFetchingLocation(false);

        // Best-effort reverse geocoding to prefill editable address fields.
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data) return;
            const addr = data.address || {};
            const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || '';
            const street = addr.road || addr.pedestrian || addr.footway || '';
            if (area) setDeliveryArea(area);
            if (street) setDeliveryStreet(street);
          })
          .catch(() => {
            // Keep coordinate fallback if reverse geocoding fails.
          });
      },
      () => {
        setLocationStatus(t('location_permission_denied'));
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (confirmCountdown === null) return;
    if (confirmCountdown === 0) {
      doSubmit();
      return;
    }
    const timer = window.setTimeout(() => setConfirmCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmCountdown]);

  const handleCancelConfirm = () => {
    setConfirmCountdown(null);
  };

  const doSubmit = async () => {
    setConfirmCountdown(null);
    setIsSubmitting(true);

    const details = {
      serviceType,
      timing,
      scheduledTime,
      paymentMethod,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      locationLabel: locationUrl ? t('location_shared') : undefined,
      locationUrl: locationUrl || undefined,
      locationCoordinates: locationCoordinates || undefined,
      locationArea: deliveryArea || undefined,
      locationStreet: deliveryStreet || undefined,
      locationBuilding: deliveryBuilding || undefined,
      locationFloor: deliveryFloor || undefined,
      locationDetails: deliveryDetails || undefined,
      discountPercentage: discountPct > 0 ? discountPct : undefined,
    };

    if (saveDetails) {
      localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify({
        customerName,
        customerPhone,
        deliveryArea,
        deliveryStreet,
        deliveryBuilding,
        deliveryFloor,
        deliveryDetails,
      }));
    }

    const link = whatsappEnabled ? generateWhatsAppLink(items, language, details, whatsappNumber) : null;
    const waWindow = link ? window.open(link, '_blank') : null;

    const snapshot = [...items];

    const { data: insertData, error: orderError } = await supabase.from('orders').insert({
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      service_type: serviceType,
      timing,
      scheduled_time: scheduledTime || null,
      payment_method: paymentMethod,
      delivery_area: deliveryArea || null,
      delivery_street: deliveryStreet || null,
      delivery_building: deliveryBuilding || null,
      delivery_floor: deliveryFloor || null,
      delivery_details: deliveryDetails || null,
      location_url: locationUrl || null,
      items: items.map((item) => ({
        name_en: item.name_en || item.name,
        name_ar: item.name_ar || item.name,
        quantity: item.quantity,
        price: item.price,
        unit: (item as unknown as Record<string, unknown>).step && ((item as unknown as Record<string, unknown>).step as number) < 1 ? 'kg' : 'piece',
        selected_options: item.selectedOptions || {},
      })),
      total: totalPrice,
    }).select('id, order_number').single();
    if (orderError) console.error('[Order save failed]', orderError);

    if (link && !waWindow) window.location.href = link;
    saveLastOrder(snapshot);
    clearCart();

    setPlacedOrder({
      id: insertData?.id ?? null,
      orderNumber: (insertData as { id: string; order_number: number } | null)?.order_number ?? null,
      items: snapshot,
      total: totalPrice,
      serviceType,
      customerName,
      customerPhone,
    });
    setIsSubmitting(false);
  };

  const handleCheckout = () => {
    if (items.length === 0 || isSubmitting || confirmCountdown !== null) return;

    if (!customerName.trim()) { setError(t('error_name_required')); return; }
    if (!customerPhone.trim()) { setError(t('error_phone_required')); return; }
    if (serviceType === 'delivery') {
      const hasPin = !!locationUrl;
      const hasTypedAddress = deliveryArea.trim() && deliveryStreet.trim();
      if (!hasPin && !hasTypedAddress) { setError(t('error_address_required')); return; }
    }
    if (timing === 'scheduled' && !scheduledTime) { setError(t('error_schedule')); return; }
    if (timing === 'scheduled' && !isScheduledTimeValid(scheduledTime)) {
      setError(language === 'ar' ? `الوقت المختار خارج ساعات العمل (${openTime} – ${closeTime}).` : `That time is outside our working hours (${openTime} – ${closeTime}).`);
      return;
    }
    if (timing === 'now' && !storeIsOpen) { setTiming('scheduled'); setError(t('error_store_closed')); return; }

    setConfirmCountdown(4);
  };

  const TRACKING_STATUS: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
    new:       { label: 'Order received',  labelAr: 'تم استلام طلبك',  color: 'bg-blue-50 text-blue-700 border-blue-200',    icon: '🕐' },
    confirmed: { label: 'Confirmed',        labelAr: 'تم تأكيد طلبك',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '✅' },
    preparing: { label: 'Being prepared',   labelAr: 'يتم التحضير',     color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '👨‍🍳' },
    ready:     { label: 'Ready for pickup', labelAr: 'جاهز للاستلام',  color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎁' },
    delivered: { label: 'Delivered',        labelAr: 'تم التوصيل',      color: 'bg-green-50 text-green-700 border-green-200',   icon: '🎉' },
    cancelled: { label: 'Cancelled',        labelAr: 'تم الإلغاء',      color: 'bg-red-50 text-red-700 border-red-200',        icon: '❌' },
  };

  const openTracking = async () => {
    setShowTracking(true);
    if (!customerPhone.trim()) return;
    setTrackingLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id,created_at,status,service_type,order_number,items,total')
      .eq('customer_phone', customerPhone.trim())
      .order('created_at', { ascending: false })
      .limit(20);
    setTrackingOrders((data as typeof trackingOrders) ?? []);
    setTrackingLoading(false);
  };

  useEffect(() => {
    if (!showTracking || trackingOrders.length === 0) return;
    const ids = trackingOrders.map((o) => o.id);
    const channel = supabase
      .channel('cart-tracking-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as { id: string; status: string };
        if (ids.includes(updated.id)) {
          setTrackingOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, status: updated.status } : o));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showTracking, trackingOrders.map((o) => o.id).join()]);

  if (placedOrder) {
    const trackUrl = placedOrder.customerPhone && placedOrder.orderNumber
      ? `/track?phone=${encodeURIComponent(placedOrder.customerPhone)}&order=${placedOrder.orderNumber}`
      : placedOrder.customerPhone
      ? `/track?phone=${encodeURIComponent(placedOrder.customerPhone)}`
      : '/track';
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">
          {/* Success header */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'ar' ? 'تم استلام طلبك!' : 'Order placed!'}
            </h2>
            {placedOrder.orderNumber != null && (
              <p className="text-sm font-semibold text-primary-600">#{placedOrder.orderNumber}</p>
            )}
            {(() => {
              const si = TRACKING_STATUS[placedOrderStatus] ?? { label: placedOrderStatus, labelAr: placedOrderStatus, color: 'bg-gray-50 text-gray-600 border-gray-200', icon: '•' };
              return (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${si.color}`}>
                  {si.icon} {language === 'ar' ? si.labelAr : si.label}
                </span>
              );
            })()}
          </div>

          {/* Items */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {language === 'ar' ? 'ملخص الطلب' : 'Order summary'}
            </p>
            {placedOrder.items.map((item) => (
              <div key={item.instanceId} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">
                    {(language === 'ar' ? item.name_ar : item.name_en) || item.name}
                  </span>
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 text-xs text-gray-500">
                  ×{item.quantity}
                  <span className="ml-2 font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="mt-1 pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-gray-900">
              <span>{language === 'ar' ? 'المجموع' : 'Total'}</span>
              <span>${placedOrder.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Track link */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary-800">
                {language === 'ar' ? 'تتبع طلبك' : 'Track your order'}
              </p>
              <p className="text-xs text-primary-600 mt-0.5">
                {language === 'ar'
                  ? 'تحقق من حالة طلبك في أي وقت.'
                  : 'Check your order status anytime.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setCartOpen(false); navigate(trackUrl); setPlacedOrder(null); }}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition"
            >
              {language === 'ar' ? 'تتبع' : 'Track'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <Button
            onClick={() => { setCartOpen(false); navigate('/'); setPlacedOrder(null); }}
            className="w-full"
          >
            {language === 'ar' ? 'متابعة التسوق' : 'Continue shopping'}
          </Button>
        </div>
      </div>
    );
  }

  if (showTracking) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button type="button" onClick={() => setShowTracking(false)} className="text-gray-500 hover:text-gray-800 transition p-1 -ml-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={language === 'ar' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-900">{language === 'ar' ? 'تتبع طلباتك' : 'Track your orders'}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {trackingLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : trackingOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-gray-500 text-sm">{language === 'ar' ? 'لا توجد طلبات مرتبطة بهذا الرقم.' : 'No orders found for this number.'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {trackingOrders.map((order) => {
                const si = TRACKING_STATUS[order.status] ?? { label: order.status, labelAr: order.status, color: 'bg-gray-50 text-gray-600 border-gray-200', icon: '•' };
                const orderDate = new Date(order.created_at);
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-b border-gray-100">
                      <div className="flex flex-col">
                        {order.order_number != null && <span className="text-xs font-bold text-primary-600">#{order.order_number}</span>}
                        <span className="text-xs text-gray-500">
                          {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          {' · '}{orderDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${si.color}`}>
                        {si.icon} {language === 'ar' ? si.labelAr : si.label}
                      </span>
                    </div>
                    <div className="px-3 py-2.5 flex flex-col gap-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-800 flex-1 min-w-0 truncate">
                            {(language === 'ar' ? item.name_ar : item.name_en) || item.name_en}
                          </span>
                          <span className="text-gray-400 shrink-0 text-xs">×{item.quantity} · ${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="pt-1.5 mt-0.5 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            order.items.forEach((item) => {
                              addItem({ id: crypto.randomUUID(), name: item.name_en || item.name_ar, name_en: item.name_en, name_ar: item.name_ar, price: item.price, quantity: item.quantity, unit: item.unit, selectedOptions: item.selected_options });
                            });
                            setShowTracking(false);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
                        >
                          🔁 {language === 'ar' ? 'أعد الطلب' : 'Reorder'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full gap-6">
        <div className="flex flex-col items-center">
          <ShoppingBagIcon className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cart_empty')}</h2>
          <p className="text-gray-500 mb-4 text-center">{t('cart_empty_desc')}</p>
          <Button onClick={() => setCartOpen(false)}>{t('start_shopping')}</Button>
        </div>

        {customerPhone && (
          <button
            type="button"
            onClick={openTracking}
            className="w-full flex items-center justify-between gap-3 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 hover:bg-primary-100 transition"
          >
            <div className="text-start">
              <p className="text-sm font-semibold text-primary-800">{language === 'ar' ? 'تتبع طلباتك' : 'Track your orders'}</p>
              <p className="text-xs text-primary-600 mt-0.5">{language === 'ar' ? 'تحقق من حالة طلباتك السابقة' : 'Check the status of your past orders'}</p>
            </div>
            <span className="text-primary-600 text-lg shrink-0">📦</span>
          </button>
        )}

        {lastOrderItems.length > 0 && (
          <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {language === 'ar' ? 'طلبك السابق' : 'Your last order'}
            </p>
            <ul className="space-y-1 mb-3">
              {lastOrderItems.slice(0, 4).map((item) => (
                <li key={item.instanceId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1 min-w-0">
                    {(language === 'ar' ? item.name_ar : item.name_en) || item.name}
                  </span>
                  <span className="text-gray-500 shrink-0 ms-2">x{item.quantity}</span>
                </li>
              ))}
              {lastOrderItems.length > 4 && (
                <li className="text-xs text-gray-400">
                  {language === 'ar' ? `+${lastOrderItems.length - 4} أكثر` : `+${lastOrderItems.length - 4} more`}
                </li>
              )}
            </ul>
            <Button
              onClick={() => {
                lastOrderItems.forEach((item) => {
                  const liveItem = allMenuItems.find((i) => i.id === item.id);
                  addItem({
                    id: item.id,
                    name: item.name,
                    name_en: item.name_en,
                    name_ar: item.name_ar,
                    image: liveItem?.image || item.image,
                    price: item.price,
                    selectedOptions: item.selectedOptions,
                    instructions: item.instructions,
                    step: item.step,
                    minQuantity: item.minQuantity,
                    quantity: item.quantity,
                  });
                });
              }}
              className="w-full"
            >
              {language === 'ar' ? 'أعد الطلب' : 'Order Again'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 scrollbar-hide">
        <div className="flex justify-end mb-2">
          <button 
            onClick={() => {
              if (window.confirm(t('confirm_clear'))) {
                clearCart();
              }
            }}
            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            {t('clear_all')}
          </button>
        </div>

        <ul role="list" className="flex flex-col gap-2 mb-4">
          {items.map((item) => (
            <li key={item.instanceId || item.id} className="bg-gray-50 border border-gray-100 rounded-xl px-3">
              <CartItemRow item={item} />
            </li>
          ))}
        </ul>

        {/* Customer Info */}
        <div className="space-y-3 bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('your_name')}</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('your_name_placeholder')}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('your_phone')}</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t('your_phone_placeholder')}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
            />
          </div>
        </div>

        {/* Order Options */}
        <div className="space-y-4 bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('service_type')}</label>
            <div className="flex gap-2">
              <OptionButton 
                selected={serviceType === 'delivery'} 
                onClick={() => {
                  setServiceType('delivery');
                  setError('');
                }}
              >
                🛵 {t('delivery')}
              </OptionButton>
              <OptionButton 
                selected={serviceType === 'takeaway'} 
                onClick={() => {
                  setServiceType('takeaway');
                  setError('');
                  clearLocationData();
                }}
              >
                🥡 {t('takeaway')}
              </OptionButton>
            </div>
          </div>

          {serviceType === 'delivery' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('delivery_location')}</label>
              <Button
                variant="secondary"
                onClick={handleGetLocation}
                className="w-full"
                disabled={isFetchingLocation}
              >
                {isFetchingLocation ? t('getting_location') : t('get_my_location')}
              </Button>
              {locationUrl && (
                <Button
                  variant="secondary"
                  onClick={handleGetLocation}
                  className="w-full mt-2"
                  disabled={isFetchingLocation}
                >
                  {t('retry_location')}
                </Button>
              )}
              {(locationUrl || deliveryArea || deliveryStreet || deliveryBuilding || deliveryFloor || deliveryDetails) && (
                <Button
                  variant="secondary"
                  onClick={clearLocationData}
                  className="w-full mt-2"
                >
                  {t('clear_location')}
                </Button>
              )}
              {locationStatus && (
                <p className={cn(
                  'mt-2 text-xs',
                  locationUrl ? 'text-green-600' : 'text-amber-600'
                )}>
                  {locationStatus}
                </p>
              )}

              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('delivery_area')}
                  </label>
                  <input
                    type="text"
                    value={deliveryArea}
                    onChange={(e) => setDeliveryArea(e.target.value)}
                    placeholder={t('delivery_area_placeholder')}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('delivery_street')}
                  </label>
                  <input
                    type="text"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder={t('delivery_street_placeholder')}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('delivery_building')}
                  </label>
                  <input
                    type="text"
                    value={deliveryBuilding}
                    onChange={(e) => setDeliveryBuilding(e.target.value)}
                    placeholder={t('delivery_building_placeholder')}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('delivery_floor')}
                  </label>
                  <input
                    type="text"
                    value={deliveryFloor}
                    onChange={(e) => setDeliveryFloor(e.target.value)}
                    placeholder={t('delivery_floor_placeholder')}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('address_details')}
                  </label>
                  <textarea
                    value={deliveryDetails}
                    onChange={(e) => setDeliveryDetails(e.target.value)}
                    placeholder={t('address_details_placeholder')}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {locationUrl && (
                <>
                  <a
                    href={locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-1 text-xs text-primary-600 hover:text-primary-700 underline"
                  >
                    {t('view_shared_location')}
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery || locationCoordinates)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block ms-3 mt-1 text-xs text-primary-600 hover:text-primary-700 underline"
                  >
                    {t('correct_pin_helper')}
                  </a>
                  {locationPreviewUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                        title="Delivery location preview"
                        src={locationPreviewUrl}
                        className="w-full h-40"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('timing')}</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { if (storeIsOpen) { setTiming('now'); setError(''); } }}
                disabled={!storeIsOpen}
                className={cn(
                  "flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all duration-200",
                  timing === 'now' && storeIsOpen
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : !storeIsOpen
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                )}
              >
                🕒 {t('now')}{!storeIsOpen && <span className="ms-1 text-[10px] sm:text-xs opacity-70">{t('store_closed_label_short')}</span>}
              </button>
              <OptionButton 
                selected={timing === 'scheduled'} 
                onClick={() => setTiming('scheduled')}
              >
                📅 {t('schedule')}
              </OptionButton>
            </div>
            
            {timing === 'scheduled' && (
              <div className="animate-in fade-in duration-200 bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Date row */}
                <div className={cn('flex items-center gap-3 px-3 py-2.5', (isClosedDay || isPastDate) && 'bg-red-50')}>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider shrink-0 w-10">
                    {language === 'ar' ? 'تاريخ' : 'Date'}
                  </span>
                  <input
                    type="date"
                    value={scheduledDate}
                    min={todayLocal}
                    onChange={(e) => { setScheduledDate(e.target.value); setScheduledTimeOfDay(''); setError(''); }}
                    className={cn(
                      'flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-800',
                      (isClosedDay || isPastDate) && 'text-red-600'
                    )}
                  />
                </div>
                <div className="border-t border-gray-100" />
                {/* Time row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider shrink-0 w-10">
                    {language === 'ar' ? 'وقت' : 'Time'}
                  </span>
                  <input
                    type="time"
                    value={scheduledTimeOfDay}
                    min={scheduledDate === todayLocal ? nowTimeLocal : openTime}
                    max={closeTime}
                    disabled={!scheduledDate || isClosedDay || isPastDate}
                    onChange={(e) => { setScheduledTimeOfDay(e.target.value); setError(''); }}
                    className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] text-gray-400 shrink-0">{openTime}–{closeTime}</span>
                </div>
                {/* Validation feedback */}
                {(isPastDate || isClosedDay || (scheduledTimeOfDay && !isScheduledTimeValid(scheduledTime))) && (
                  <div className="border-t border-gray-100 px-3 py-2.5 bg-red-50 flex items-start gap-2">
                    <span className="text-sm leading-none mt-0.5 shrink-0">⚠️</span>
                    <p className="text-sm text-red-700 leading-snug">
                      {isPastDate
                        ? (language === 'ar' ? 'هذا التاريخ قد مضى — اختر اليوم أو لاحقاً' : "That date has already passed — pick today or later.")
                        : isClosedDay
                        ? (language === 'ar' ? 'نحن مغلقون في هذا اليوم — جرب تاريخاً آخر' : "We're closed that day — try a different date.")
                        : (language === 'ar' ? `هذا الوقت خارج أوقات العمل (${openTime} – ${closeTime}) — اختر وقتاً آخر` : `That time is outside our working hours (${openTime} – ${closeTime}).`)}
                    </p>
                  </div>
                )}
                {scheduledTime && isScheduledTimeValid(scheduledTime) && (
                  <div className="border-t border-gray-100 px-3 py-2.5 bg-green-50 flex items-center gap-2">
                    <span className="text-sm leading-none shrink-0">✅</span>
                    <p className="text-sm text-green-700">{language === 'ar' ? 'الوقت متاح' : "Looks good — we'll have it ready for you."}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('payment_method')}</label>
            <div className="flex gap-2">
              <OptionButton 
                selected={paymentMethod === 'cash'} 
                onClick={() => setPaymentMethod('cash')}
              >
                💵 {t('cash')}
              </OptionButton>
              <OptionButton 
                selected={paymentMethod === 'card'} 
                onClick={() => setPaymentMethod('card')}
              >
                💳 {t('card')}
              </OptionButton>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white px-4 py-3 border-t border-gray-100 mt-auto safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {error && (
          <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <p className="flex-1 text-sm text-red-700 leading-snug">{error}</p>
            <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0 mt-0.5 text-base leading-none">✕</button>
          </div>
        )}

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="flex items-baseline gap-1.5 text-xs text-gray-400">
                <span>{t('total_items')}</span>
                <span className="font-medium text-gray-600">{totalItems}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex items-baseline gap-1.5 text-xs text-emerald-600 font-medium">
                  <span>-{discountPct}%</span>
                  <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {serviceType === 'delivery' && (
                <div className="flex items-baseline gap-1.5 text-xs text-gray-400">
                  <span>{t('delivery_charge')}</span>
                  <span className="font-medium text-gray-600">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm text-gray-500">{t('total_amount')}</span>
              {discountPct > 0 && (
                <span className="text-sm text-gray-400 line-through">${(originalSubtotal + deliveryFee).toFixed(2)}</span>
              )}
              <span className="text-xl font-bold text-gray-900">${totalPrice.toFixed(2)}</span>
            </div>
            {(hasWeightBasedItem || paymentMethod === 'card') && (
              <div className="mt-1 text-[10px] text-gray-400 leading-tight">
                {hasWeightBasedItem && <span><span className="font-semibold">{t('disclaimer_title')}</span> {t('disclaimer_text')}</span>}
                {paymentMethod === 'card' && <span className={hasWeightBasedItem ? 'ms-1' : ''}>{t('card_disclaimer')}</span>}
              </div>
            )}
            <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveDetails}
                onChange={(e) => setSaveDetails(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-xs text-gray-400">{t('save_details')}</span>
            </label>
          </div>

        <Button
          onClick={handleCheckout}
          disabled={isSubmitting || confirmCountdown !== null}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-shadow disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {t('sending')}
            </>
          ) : whatsappEnabled ? t('confirm_whatsapp') : t('confirm_order')}
        </Button>
        </div>
      </div>
    </div>

    {confirmCountdown !== null && (
      <div
        className={cn(
          "fixed z-50 bottom-24 sm:bottom-8 rounded-2xl shadow-2xl bg-gray-900 text-white border border-gray-700/70 w-[min(92vw,30rem)] overflow-hidden",
          language === 'ar' ? "left-4 sm:left-6" : "right-4 sm:right-6"
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="text-lg leading-none mt-0.5 shrink-0">🛍️</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-gray-300">
              {language === 'ar' ? 'تأكيد الطلب' : 'Confirm order'}
            </p>
            <p className="text-sm font-medium leading-snug">
              {language === 'ar'
                ? `سيتم تأكيد الطلب خلال ${confirmCountdown} ثوانٍ…`
                : `Placing order in ${confirmCountdown}s…`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="h-9 px-3 rounded-lg bg-amber-300 text-gray-900 text-sm font-semibold hover:bg-amber-200 active:scale-[0.98] transition"
              onClick={handleCancelConfirm}
            >
              {language === 'ar' ? 'تعديل' : 'Edit'}
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
              onClick={handleCancelConfirm}
              aria-label="Cancel"
            >
              <XMarkIcon className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <div className="h-full w-full bg-secondary-400/80 animate-[shrink_4s_linear_forwards]" />
        </div>
      </div>
    )}
    </>
  );
};
