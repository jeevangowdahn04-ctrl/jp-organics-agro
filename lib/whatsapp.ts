// ಆರ್ಡರ್‌ಗಳು ಹೋಗುವ WhatsApp ಸಂಖ್ಯೆ (ದೇಶದ ಕೋಡ್ ಸಹಿತ, + ಇಲ್ಲದೆ)
export const WHATSAPP_NUMBER = "916360628048";

export interface OrderLine {
  name: string;
  price: number;
  quantity: number;
  weight?: string | null;
}

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

// ಕಾರ್ಟ್‌ನ ಎಲ್ಲಾ ಪ್ರಾಡಕ್ಟ್, ಕ್ವಾಂಟಿಟಿ ಮತ್ತು ಒಟ್ಟು ಬೆಲೆಯೊಂದಿಗೆ WhatsApp ಸಂದೇಶ
export function buildOrderMessage(lines: OrderLine[]) {
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  let message = "ನಮಸ್ಕಾರ JP Organics, ನಾನು ಈ ಕೆಳಗಿನ ಉತ್ಪನ್ನಗಳನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ:\n\n";
  lines.forEach((l, i) => {
    const weight = l.weight ? ` (${l.weight})` : "";
    message += `${i + 1}. ${l.name}${weight}\n   ${l.quantity} × ${formatRupees(l.price)} = ${formatRupees(l.price * l.quantity)}\n`;
  });
  message += `\nಒಟ್ಟು ವಸ್ತುಗಳು: ${lines.reduce((s, l) => s + l.quantity, 0)}\n`;
  message += `ಒಟ್ಟು ಮೊತ್ತ: ${formatRupees(total)}\n\n`;
  message += "ದಯವಿಟ್ಟು ಡೆಲಿವರಿ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಿ.";
  return message;
}

export function whatsappOrderUrl(lines: OrderLine[]) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage(lines))}`;
}
