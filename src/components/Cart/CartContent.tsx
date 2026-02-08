import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cartStore';
import { useLanguageStore } from '../../store/languageStore';
import { CartItemRow } from './CartItemRow';
import { Button } from '../UI/Button';
import { generateWhatsAppLink } from '../../utils/whatsapp';
import { cn } from '../../utils/cn';

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
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();
  const totalItems = getTotalItems();
  const hasWeightBasedItem = items.some((item) => (item.step ?? 1) < 1 || (item.minQuantity ?? 1) < 1);

  const [serviceType, setServiceType] = useState<'takeaway' | 'delivery'>('delivery');
  const itemsTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = serviceType === 'delivery' ? 1.5 : 0;
  const totalPrice = itemsTotal + deliveryFee;
  const [timing, setTiming] = useState<'now' | 'scheduled'>('now');
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

  const handleCheckout = () => {
    if (items.length === 0) return;

    if (timing === 'scheduled' && !scheduledTime) {
      setError(t('error_schedule'));
      return;
    }
    
    const details = {
      serviceType,
      timing,
      scheduledTime,
      paymentMethod,
      locationLabel: locationUrl ? t('location_shared') : undefined,
      locationUrl: locationUrl || undefined,
      locationCoordinates: locationCoordinates || undefined,
      locationArea: deliveryArea || undefined,
      locationStreet: deliveryStreet || undefined,
      locationBuilding: deliveryBuilding || undefined,
      locationFloor: deliveryFloor || undefined,
      locationDetails: deliveryDetails || undefined
    };

    const link = generateWhatsAppLink(items, language, details);
    
    window.open(link, '_blank');
    clearCart();
    setCartOpen(false);
    navigate('/');
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <ShoppingBagIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cart_empty')}</h2>
        <p className="text-gray-500 mb-8 text-center">{t('cart_empty_desc')}</p>
        <Button onClick={() => setCartOpen(false)}>{t('start_shopping')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
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

        <ul role="list" className="divide-y divide-gray-100 mb-6">
          {items.map((item) => (
            <li key={item.instanceId || item.id} className="py-4">
              <CartItemRow item={item} />
            </li>
          ))}
        </ul>

        {/* Order Options */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
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
                    className="inline-block ml-3 mt-1 text-xs text-primary-600 hover:text-primary-700 underline"
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
              <OptionButton 
                selected={timing === 'now'} 
                onClick={() => {
                  setTiming('now');
                  setError('');
                }}
              >
                🕒 {t('now')}
              </OptionButton>
              <OptionButton 
                selected={timing === 'scheduled'} 
                onClick={() => setTiming('scheduled')}
              >
                📅 {t('schedule')}
              </OptionButton>
            </div>
            
            {timing === 'scheduled' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    setError('');
                  }}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  min={new Date().toISOString().slice(0, 16)}
                />
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
      
      <div className="bg-white p-6 border-t border-gray-100 mt-auto safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {error && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}
        
        <div className="flex justify-between text-base font-medium text-gray-500 mb-2">
          <span>{t('total_items')}</span>
          <span>{totalItems}</span>
        </div>
        {serviceType === 'delivery' && (
          <div className="flex justify-between text-base font-medium text-gray-500 mb-2">
            <span>{t('delivery_charge')}</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-bold text-gray-900 mb-6">
          <span>{t('total_amount')}</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>

        {(hasWeightBasedItem || paymentMethod === 'card') && (
          <div className="mb-4 text-xs text-gray-500">
            {hasWeightBasedItem && (
              <div>
                <span className="font-semibold text-gray-600">{t('disclaimer_title')}</span> {t('disclaimer_text')}
              </div>
            )}
            {paymentMethod === 'card' && (
              <div className="mt-1 text-primary-600 font-medium">
                {t('card_disclaimer')}
              </div>
            )}
          </div>
        )}
        
        <Button
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-2 py-4 text-lg shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-shadow"
        >
          {t('confirm_whatsapp')}
        </Button>
      </div>
    </div>
  );
};
