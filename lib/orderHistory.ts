import { useSyncExternalStore } from "react";
import type { OrderCustomer, OrderLine } from "@/lib/whatsapp";

// "ನನ್ನ ಆರ್ಡರ್‌ಗಳು": ಈ ಬ್ರೌಸರ್‌ನಿಂದ WhatsApp ಮೂಲಕ ಕಳುಹಿಸಿದ ಆರ್ಡರ್‌ಗಳ ದಾಖಲೆ.
// ಆರ್ಡರ್‌ಗಳು ಸರ್ವರ್‌ನಲ್ಲಿ ಉಳಿಯುವುದಿಲ್ಲ (ಆರ್ಡರ್ WhatsApp ಸಂದೇಶವಾಗಿ ಹೋಗುತ್ತದೆ), ಹಾಗಾಗಿ ಈ ಪಟ್ಟಿ ಇದೇ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ.
export interface SavedOrder {
  id: string;
  createdAt: string; // ISO
  lines: OrderLine[];
  total: number;
  customer?: OrderCustomer | null;
}

const STORAGE_KEY = "jp-organics-orders-v1";
const MAX_ORDERS = 50;
const EMPTY: SavedOrder[] = [];
let orders: SavedOrder[] | null = null;
const listeners = new Set<() => void>();

function readStored(): SavedOrder[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((o) => o && Array.isArray(o.lines) && o.createdAt) : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (orders === null) orders = readStored();
  return orders;
}

function write(next: SavedOrder[]) {
  orders = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage ತಡೆ: ಈ ಪೇಜ್‌ನಲ್ಲಿ ಮಾತ್ರ ಉಳಿಯುತ್ತದೆ
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      orders = readStored();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveOrder(lines: OrderLine[], customer?: OrderCustomer | null) {
  const order: SavedOrder = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    lines,
    total: lines.reduce((s, l) => s + l.price * l.quantity, 0),
    customer: customer ?? null,
  };
  write([order, ...getSnapshot()].slice(0, MAX_ORDERS));
}

export function clearOrders() {
  write([]);
}

export function useOrderHistory() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
