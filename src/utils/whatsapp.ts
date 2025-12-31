import type { CartItem } from '../store/cartStore';

const getNumberEmoji = (num: number): string => {
  const emojis = [
    '\u0030\uFE0F\u20E3', // 0
    '\u0031\uFE0F\u20E3', // 1
    '\u0032\uFE0F\u20E3', // 2
    '\u0033\uFE0F\u20E3', // 3
    '\u0034\uFE0F\u20E3', // 4
    '\u0035\uFE0F\u20E3', // 5
    '\u0036\uFE0F\u20E3', // 6
    '\u0037\uFE0F\u20E3', // 7
    '\u0038\uFE0F\u20E3', // 8
    '\u0039\uFE0F\u20E3', // 9
    '\uD83D\uDD1F'        // 10
  ];
  if (num <= 10) return emojis[num];
  return `${num}`;
};

export interface OrderDetails {
  serviceType: 'takeaway' | 'delivery';
  timing: 'now' | 'scheduled';
  scheduledTime?: string;
  paymentMethod: 'cash' | 'card';
}

export const generateWhatsAppLink = (items: CartItem[], details?: OrderDetails): string => {
  const number = '96176730370';
  
  // Hello 👋
  let message = 'Hello \uD83D\uDC4B\nI would like to place an order:\n\n';

  if (details) {
    message += `*Order Type:* ${details.serviceType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway'}\n`;
    message += `*Time:* ${details.timing === 'now' ? '🕒 As soon as possible' : `📅 ${details.scheduledTime}`}\n`;
    message += `*Payment:* ${details.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}\n`;
    message += '--------------------\n\n';
  }
  
  items.forEach((item, index) => {
    // Using index + 1 for the list number
    const bullet = getNumberEmoji(index + 1);
    message += `${bullet} ${item.name}\n`;
    message += `Qty: ${item.quantity}\n`;
    message += `Price: $${(item.price * item.quantity).toFixed(2)}\n`;
    if (item.instructions && item.instructions.trim()) {
      message += `Instructions: ${item.instructions.trim()}\n`;
    }
    message += '\n';
  });
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  message += '--------------------\n';
  message += `Total Items: ${totalItems}\n`;
  message += `Total Bill: $${totalPrice.toFixed(2)}\n`;
  message += 'Thank you.';
  
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${number}?text=${encodedMessage}`;
};
