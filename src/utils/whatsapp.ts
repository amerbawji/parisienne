import type { CartItem } from '../store/cartStore';

const getItemIndexLabel = (num: number): string => `${num}.`;

export interface OrderDetails {
  serviceType: 'takeaway' | 'delivery';
  timing: 'now' | 'scheduled';
  scheduledTime?: string;
  paymentMethod: 'cash' | 'card';
  locationLabel?: string;
  locationUrl?: string;
  locationCoordinates?: string;
  locationArea?: string;
  locationStreet?: string;
  locationBuilding?: string;
  locationFloor?: string;
  locationDetails?: string;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
};

export const generateWhatsAppLink = (items: CartItem[], language: 'en' | 'ar', details?: OrderDetails): string => {
  const number = '9613502022';
  const isAr = language === 'ar';

  // Translations
  const t = {
    hello: isAr ? 'مرحبا \uD83D\uDC4B\nأود تقديم طلب:\n\n' : 'Hello \uD83D\uDC4B\nI would like to place an order:\n\n',
    orderType: isAr ? '*نوع الطلب:*' : '*Order Type:*',
    delivery: isAr ? '🛵 توصيل' : '🛵 Delivery',
    takeaway: isAr ? '🥡 سفري' : '🥡 Takeaway',
    time: isAr ? '*الوقت:*' : '*Time:*',
    asap: isAr ? '🕒 بأقرب وقت ممكن' : '🕒 As soon as possible',
    payment: isAr ? '*الدفع:*' : '*Payment:*',
    cash: isAr ? '💵 كاش' : '💵 Cash',
    card: isAr ? '💳 بطاقة' : '💳 Card',
    location: isAr ? '*الموقع:*' : '*Location:*',
    area: isAr ? '*المنطقة:*' : '*Area:*',
    street: isAr ? '*الشارع:*' : '*Street:*',
    building: isAr ? '*المبنى:*' : '*Building:*',
    floor: isAr ? '*الطابق:*' : '*Floor:*',
    details: isAr ? '*تفاصيل إضافية:*' : '*Address Details:*',
    coordinates: isAr ? '*الإحداثيات:*' : '*Coordinates:*',
    locationUnavailable: isAr ? 'غير متوفر' : 'Not provided',
    qty: isAr ? 'الكمية:' : 'Qty:',
    price: isAr ? 'السعر:' : 'Price:',
    instructions: isAr ? 'ملاحظات:' : 'Instructions:',
    totalItems: isAr ? 'عدد العناصر:' : 'Total Items:',
    deliveryCharge: isAr ? 'كلفة التوصيل:' : 'Delivery Charge:',
    totalBill: isAr ? 'المجموع النهائي:' : 'Total Bill:',
    thankYou: isAr ? 'شكرا.' : 'Thank you.'
  };
  
  let message = t.hello;

  if (details) {
    message += `${t.orderType} ${details.serviceType === 'delivery' ? t.delivery : t.takeaway}\n`;
    message += `${t.time} ${details.timing === 'now' ? t.asap : `📅 ${formatDate(details.scheduledTime)}`}\n`;
    message += `${t.payment} ${details.paymentMethod === 'cash' ? t.cash : t.card}\n`;
    if (details.serviceType === 'delivery') {
      if (details.locationUrl) {
        message += `${t.location} ${details.locationLabel || details.locationUrl}\n`;
        message += `${details.locationUrl}\n`;
        if (details.locationArea) {
          message += `${t.area} ${details.locationArea}\n`;
        }
        if (details.locationStreet) {
          message += `${t.street} ${details.locationStreet}\n`;
        }
        if (details.locationBuilding) {
          message += `${t.building} ${details.locationBuilding}\n`;
        }
        if (details.locationFloor) {
          message += `${t.floor} ${details.locationFloor}\n`;
        }
        if (details.locationDetails) {
          message += `${t.details} ${details.locationDetails}\n`;
        }
        if (details.locationCoordinates) {
          message += `${t.coordinates} ${details.locationCoordinates}\n`;
        }
      } else {
        message += `${t.location} ${t.locationUnavailable}\n`;
      }
    }
    message += '--------------------\n\n';
  }
  
  items.forEach((item, index) => {
    // Using index + 1 for the list number
    const bullet = getItemIndexLabel(index + 1);
    const itemName = isAr ? (item.name_ar || item.name) : (item.name_en || item.name);
    
    message += `${bullet} ${itemName}\n`;
    message += `${t.qty} ${item.quantity}\n`;
    message += `${t.price} $${(item.price * item.quantity).toFixed(2)}\n`;
    
    if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
      Object.entries(item.selectedOptions).forEach(([key, value]) => {
         message += `- ${key}: ${value}\n`;
      });
    }

    if (item.instructions && item.instructions.trim()) {
      message += `${t.instructions} ${item.instructions.trim()}\n`;
    }
    message += '\n';
  });
  
  const totalItems = items.reduce((sum, item) => {
     if (item.step && item.step < 1) return sum + 1;
     return sum + item.quantity;
  }, 0);
  
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let finalTotal = itemsTotal;
  
  message += '--------------------\n';
  message += `${t.totalItems} ${totalItems}\n`;

  if (details && details.serviceType === 'delivery') {
    const deliveryFee = 1.5;
    finalTotal += deliveryFee;
    message += `${t.deliveryCharge} $${deliveryFee.toFixed(2)}\n`;
  }

  message += `${t.totalBill} $${finalTotal.toFixed(2)}\n`;
  message += t.thankYou;
  
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${number}?text=${encodedMessage}`;
};
