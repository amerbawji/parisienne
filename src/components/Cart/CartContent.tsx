import { useState, useEffect } from 'react';

const SAVED_DETAILS_KEY = 'parisienne_saved_details';
import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cartStore';
import { useLanguageStore } from '../../store/languageStore';
import { CartItemRow } from './CartItemRow';
import { Button } from '../UI/Button';
import { generateWhatsAppLink } from '../../utils/whatsapp';
import { cn } from '../../utils/cn';
import { supabase } from '../../lib/supabase';
import { useStoreConfigStore } from '../../store/storeConfigStore';
import { useLastOrderStore } from '../../store/lastOrderStore';

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
  const saveLastOrder = useLastOrderStore((s) => s.saveOrder);
  const lastOrderItems = useLastOrderStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const { t, language } = useLanguageStore();
  const storeIsOpen = useStoreConfigStore((s) => s.isOpen());
  const whatsappNumber = useStoreConfigStore((s) => s.whatsapp_number);
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
  const [scheduledTime, setScheduledTime] = useState('');
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

  useEffect(() => {
    if (!storeIsOpen && timing === 'now') setTiming('scheduled');
  }, [storeIsOpen]);

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

  const nowLocalDT = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  const isClosedDay = scheduledTime
    ? closedDays.includes(new Date(scheduledTime).getDay())
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

  const handleCheckout = async () => {
    if (items.length === 0 || isSubmitting) return;

    if (!customerName.trim()) { setError(t('error_name_required')); return; }
    if (!customerPhone.trim()) { setError(t('error_phone_required')); return; }
    if (serviceType === 'delivery') {
      const hasPin = !!locationUrl;
      const hasTypedAddress = deliveryArea.trim() && deliveryStreet.trim();
      if (!hasPin && !hasTypedAddress) {
        setError(t('error_address_required')); return;
      }
    }
    if (timing === 'scheduled' && !scheduledTime) {
      setError(t('error_schedule'));
      return;
    }
    if (timing === 'scheduled' && !isScheduledTimeValid(scheduledTime)) {
      setError(language === 'ar' ? 'المتجر مغلق في هذا الوقت. اختر وقتاً آخر.' : 'Store is closed at the selected time. Please choose another time.');
      return;
    }
    if (timing === 'now' && !storeIsOpen) {
      setTiming('scheduled');
      setError(t('error_store_closed'));
      return;
    }

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

    const link = generateWhatsAppLink(items, language, details, whatsappNumber);

    // Open a blank window synchronously while still in the user-gesture context.
    // Safari (and iOS PWA homescreen) blocks window.open called after any await.
    // We get the reference now, then set its href once the DB write is done.
    const waWindow = window.open('', '_blank');

    const { error: orderError } = await supabase.from('orders').insert({
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
    });
    if (orderError) console.error('[Order save failed]', orderError);

    // Redirect the pre-opened window to WhatsApp; fall back to location.href
    // if the browser blocked the popup (e.g. standalone PWA on older iOS).
    if (waWindow) {
      waWindow.location.href = link;
    } else {
      window.location.href = link;
    }
    saveLastOrder(items);
    clearCart();
    setCartOpen(false);
    navigate('/');
    setIsSubmitting(false);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full gap-6">
        <div className="flex flex-col items-center">
          <ShoppingBagIcon className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cart_empty')}</h2>
          <p className="text-gray-500 mb-4 text-center">{t('cart_empty_desc')}</p>
          <Button onClick={() => setCartOpen(false)}>{t('start_shopping')}</Button>
        </div>

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
                  addItem({
                    id: item.id,
                    name: item.name,
                    name_en: item.name_en,
                    name_ar: item.name_ar,
                    image: item.image,
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
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-1.5 bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'موعد الطلب' : 'Schedule for'}
                  </label>
                  <span className="text-[11px] text-gray-400">{openTime} – {closeTime}</span>
                </div>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  min={nowLocalDT}
                  onChange={(e) => { setScheduledTime(e.target.value); setError(''); }}
                  className={cn(
                    'w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-800',
                    isClosedDay ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  )}
                />
                {scheduledTime && (() => {
                  if (isClosedDay) return (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span>⚠️</span>
                      {language === 'ar' ? 'المتجر مغلق في هذا اليوم' : 'Store is closed on this day'}
                    </p>
                  );
                  const d = new Date(scheduledTime);
                  const [oh, om] = openTime.split(':').map(Number);
                  const [ch, cm] = closeTime.split(':').map(Number);
                  const mins = d.getHours() * 60 + d.getMinutes();
                  const openMins = oh * 60 + om;
                  const closeMins = ch * 60 + cm;
                  const outOfHours = closeMins <= openMins
                    ? !(mins >= openMins || mins < closeMins)
                    : !(mins >= openMins && mins < closeMins);
                  if (outOfHours) return (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span>⚠️</span>
                      {language === 'ar' ? `أوقات العمل: ${openTime} – ${closeTime}` : `Working hours: ${openTime} – ${closeTime}`}
                    </p>
                  );
                  return (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span>✓</span>
                      {language === 'ar' ? 'الوقت متاح' : 'Time available'}
                    </p>
                  );
                })()}
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
          <div className="mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
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
          disabled={isSubmitting}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-shadow disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {t('sending')}
            </>
          ) : t('confirm_whatsapp')}
        </Button>
        </div>
      </div>
    </div>
  );
};
