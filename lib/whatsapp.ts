import { formatAddressLines, type DeliveryAddress } from "@/lib/address";

// ಆರ್ಡರ್‌ಗಳು ಹೋಗುವ WhatsApp ಸಂಖ್ಯೆ (ದೇಶದ ಕೋಡ್ ಸಹಿತ, + ಇಲ್ಲದೆ)
export const WHATSAPP_NUMBER = "916360628048";

export interface OrderLine {
  name: string;
  price: number;
  quantity: number;
  weight?: string | null;
}

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export interface OrderCustomer {
  name: string;
  phone: string;
  address?: DeliveryAddress | null;
}

// ಕಾರ್ಟ್‌ನ ಎಲ್ಲಾ ಪ್ರಾಡಕ್ಟ್, ಕ್ವಾಂಟಿಟಿ, ಒಟ್ಟು ಬೆಲೆ ಮತ್ತು ಗ್ರಾಹಕರ ವಿವರದೊಂದಿಗೆ WhatsApp ಸಂದೇಶ
export function buildOrderMessage(lines: OrderLine[], customer?: OrderCustomer | null) {
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  let message = "ನಮಸ್ಕಾರ JP Organics, ನಾನು ಈ ಕೆಳಗಿನ ಉತ್ಪನ್ನಗಳನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ:\n\n";
  lines.forEach((l, i) => {
    const weight = l.weight ? ` (${l.weight})` : "";
    message += `${i + 1}. ${l.name}${weight}\n   ${l.quantity} × ${formatRupees(l.price)} = ${formatRupees(l.price * l.quantity)}\n`;
  });
  message += `\nಒಟ್ಟು ವಸ್ತುಗಳು: ${lines.reduce((s, l) => s + l.quantity, 0)}\n`;
  message += `ಒಟ್ಟು ಮೊತ್ತ: ${formatRupees(total)}\n\n`;
  if (customer) {
    message += `ಗ್ರಾಹಕರ ಹೆಸರು: ${customer.name}\nಮೊಬೈಲ್: +91 ${customer.phone}\n\n`;
    const addressLines = customer.address ? formatAddressLines(customer.address) : [];
    if (addressLines.length) {
      message += `ಡೆಲಿವರಿ ವಿಳಾಸ:\n${addressLines.join("\n")}\n\n`;
    }
  }
  message += "ದಯವಿಟ್ಟು ಡೆಲಿವರಿ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಿ.";
  return message;
}

export function whatsappOrderUrl(lines: OrderLine[], customer?: OrderCustomer | null) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage(lines, customer))}`;
}
