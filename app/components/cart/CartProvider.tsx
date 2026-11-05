"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import CartDrawer from "./CartDrawer";

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  weight?: string | null;
  image?: string | null;
  quantity: number;
}

export interface CartProduct {
  id: number | string;
  name: string;
  price: number;
  weight?: string | null;
  image?: string | null;
}

export const MAX_QUANTITY = 99;
const STORAGE_KEY = "jp-organics-cart-v1";
const EMPTY: CartItem[] = [];

// ಕಾರ್ಟ್ ಸ್ಟೋರ್: ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಯುತ್ತದೆ (refresh / ಬೇರೆ ಪೇಜ್‌ಗೆ ಹೋದರೂ ಕಾರ್ಟ್ ಖಾಲಿಯಾಗುವುದಿಲ್ಲ)
let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

function readStored(): CartItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && i.id != null && typeof i.name === "string" && Number.isFinite(i.price) && i.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (items === null) items = readStored();
  return items;
}

function setItems(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private window / storage ತಡೆ: ಕಾರ್ಟ್ ಈ ಪೇಜ್‌ನಲ್ಲಿ ಮಾತ್ರ ಕೆಲಸ ಮಾಡುತ್ತದೆ
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // ಬೇರೆ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಕಾರ್ಟ್ ಬದಲಾದರೆ ಇಲ್ಲೂ ಅಪ್‌ಡೇಟ್
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      items = readStored();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const clampQty = (q: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.floor(q) || 1));

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: CartProduct, quantity?: number, options?: { open?: boolean }) => void;
  setQuantity: (id: CartItem["id"], quantity: number) => void;
  removeItem: (id: CartItem["id"]) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cartItems = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback<CartContextValue["addItem"]>((product, quantity = 1, options) => {
    const current = getSnapshot();
    const existing = current.find((i) => i.id === product.id);
    const next = existing
      ? current.map((i) =>
          i.id === product.id
            ? { ...i, name: product.name, price: Number(product.price), weight: product.weight, image: product.image, quantity: clampQty(i.quantity + quantity) }
            : i
        )
      : [...current, { ...product, price: Number(product.price), quantity: clampQty(quantity) }];
    setItems(next);
    if (options?.open !== false) setIsOpen(true);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items: cartItems,
      count: cartItems.reduce((s, i) => s + i.quantity, 0),
      total: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity: (id, quantity) => setItems(getSnapshot().map((i) => (i.id === id ? { ...i, quantity: clampQty(quantity) } : i))),
      removeItem: (id) => setItems(getSnapshot().filter((i) => i.id !== id)),
      clearCart: () => setItems([]),
    }),
    [cartItems, isOpen, addItem]
  );

  return (
    <CartContext value={value}>
      {children}
      <CartDrawer />
    </CartContext>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
