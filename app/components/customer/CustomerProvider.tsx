"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import LoginModal from "./LoginModal";

export interface Customer {
  name: string;
  phone: string; // 10 ಅಂಕಿ, +91 ಇಲ್ಲದೆ
}

// ಗ್ರಾಹಕರ ಲಾಗಿನ್ ಈ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಉಳಿಯುತ್ತದೆ (Logout ಮಾಡುವವರೆಗೆ ಮತ್ತೆ ಕೇಳುವುದಿಲ್ಲ).
// ಸೂಚನೆ: ಇದು OTP ಪರಿಶೀಲನೆ ಇಲ್ಲದ ಸರಳ ಲಾಗಿನ್; ನಂಬರ್ ಆರ್ಡರ್ ಸಂದೇಶದಲ್ಲಿ ಸಂಪರ್ಕಕ್ಕಾಗಿ ಮಾತ್ರ.
const STORAGE_KEY = "jp-organics-customer-v1";
export const PHONE_PATTERN = /^[6-9]\d{9}$/;

let current: Customer | null | undefined;
const listeners = new Set<() => void>();

function readStored(): Customer | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed.name === "string" && PHONE_PATTERN.test(parsed.phone) ? parsed : null;
  } catch {
    return null;
  }
}

function getSnapshot() {
  if (current === undefined) current = readStored();
  return current;
}

function setCustomer(next: Customer | null) {
  current = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage ತಡೆ: ಈ ಪೇಜ್‌ನಲ್ಲಿ ಮಾತ್ರ ಲಾಗಿನ್ ಉಳಿಯುತ್ತದೆ
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = readStored();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

interface CustomerContextValue {
  customer: Customer | null;
  openLogin: () => void;
  logout: () => void;
  // ಲಾಗಿನ್ ಆಗಿದ್ದರೆ ತಕ್ಷಣ, ಇಲ್ಲದಿದ್ದರೆ ಲಾಗಿನ್ ಆದ ನಂತರ action ನಡೆಸುತ್ತದೆ
  requireLogin: (action: (customer: Customer) => void, reason?: string) => void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const customer = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [modal, setModal] = useState<{ open: boolean; reason?: string }>({ open: false });
  const pending = useRef<((c: Customer) => void) | null>(null);

  const requireLogin = useCallback<CustomerContextValue["requireLogin"]>((action, reason) => {
    const logged = getSnapshot();
    if (logged) {
      action(logged);
      return;
    }
    pending.current = action;
    setModal({ open: true, reason });
  }, []);

  const value = useMemo<CustomerContextValue>(
    () => ({
      customer,
      openLogin: () => {
        pending.current = null;
        setModal({ open: true });
      },
      logout: () => setCustomer(null),
      requireLogin,
    }),
    [customer, requireLogin]
  );

  const close = () => {
    pending.current = null;
    setModal({ open: false });
  };

  const onLogin = (c: Customer) => {
    setCustomer(c);
    setModal({ open: false });
    const action = pending.current;
    pending.current = null;
    action?.(c);
  };

  return (
    <CustomerContext value={value}>
      {children}
      {modal.open && <LoginModal reason={modal.reason} onClose={close} onLogin={onLogin} />}
    </CustomerContext>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer must be used inside <CustomerProvider>");
  return ctx;
}
