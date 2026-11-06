"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BadgeCheck, ExternalLink, LayoutGrid, LogOut, Package, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";

// ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್ ಕೋಡ್ ಅಡ್ಮಿನ್ ಅದನ್ನು ತೆರೆದಾಗ ಮಾತ್ರ ಡೌನ್‌ಲೋಡ್ ಆಗುತ್ತದೆ; ಸಾಮಾನ್ಯ ಗ್ರಾಹಕರ ಬ್ರೌಸರ್‌ಗೆ ಈ ಕೋಡ್ ಹೋಗುವುದೇ ಇಲ್ಲ
const AdminDashboard = dynamic(() => import("../../admin/AdminDashboard"), {
  ssr: false,
  loading: () => <p className="text-center text-emerald-700 font-semibold py-16">ಲೋಡ್ ಆಗುತ್ತಿದೆ...</p>,
});
import { adminLogoutInline, adminStatus, deleteProduct, setProductStock } from "../../admin/actions";

// ಮುಖಪುಟದ ಇನ್‌ಲೈನ್ ಅಡ್ಮಿನ್ ಮೋಡ್: ಅಡ್ಮಿನ್ ಲಾಗಿನ್ ಆಗಿದ್ದರೆ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ.
// ಎಲ್ಲಾ ಬದಲಾವಣೆಗಳನ್ನು ಸರ್ವರ್ ಮತ್ತೆ ಅಡ್ಮಿನ್ ಕುಕೀಯಿಂದ ಪರಿಶೀಲಿಸುತ್ತದೆ; ಇಲ್ಲಿನ ಸ್ಥಿತಿ UI ತೋರಿಸಲು ಮಾತ್ರ.

// ಅಡ್ಮಿನ್ ಸ್ಥಿತಿ ಎಲ್ಲಾ ಕಾಂಪೊನೆಂಟ್‌ಗಳಿಗೆ ಒಂದೇ (ರಹಸ್ಯ ಲಾಗಿನ್ ಪಾಪ್-ಅಪ್‌ನಿಂದ ಲಾಗಿನ್ ಆದ ತಕ್ಷಣ ಮುಖಪುಟದಲ್ಲಿ ಕಂಟ್ರೋಲ್‌ಗಳು ಬರಲು)
let adminState: boolean | null = null;
let checking = false;
const adminListeners = new Set<() => void>();

export function setAdminMode(value: boolean) {
  adminState = value;
  adminListeners.forEach((l) => l());
}

// ಸರ್ವರ್‌ನಲ್ಲಿ ಅಡ್ಮಿನ್ ಸೆಷನ್ (ಕುಕೀ) ನಿಜವಾಗಿ ಇದೆಯೇ ಎಂದು ಕೇಳುವುದು
let lastCheck = 0;
function checkAdmin() {
  if (checking) return;
  // ಅಡ್ಮಿನ್ ಸೂಚನಾ ಕುಕೀ ಇಲ್ಲದಿದ್ದರೆ (ಸಾಮಾನ್ಯ ಗ್ರಾಹಕರು) ಸರ್ವರ್ ಕರೆ ಬೇಡ: ಪುಟ ವೇಗ + ಸರ್ವರ್ ಉಳಿತಾಯ
  if (!document.cookie.split("; ").some((c) => c.startsWith("jp_admin_hint="))) {
    lastCheck = Date.now();
    setAdminMode(false);
    return;
  }
  checking = true;
  lastCheck = Date.now();
  adminStatus()
    .then((r) => setAdminMode(Boolean(r?.isAdmin)))
    .catch(() => {})
    .finally(() => {
      checking = false;
    });
}

// ಪುಟಕ್ಕೆ ಮರಳಿದಾಗ (ಬೇರೆ ಟ್ಯಾಬ್/ಆ್ಯಪ್‌ನಿಂದ) ಮತ್ತೆ ಪರಿಶೀಲನೆ: ಅಲ್ಲಿ Exit ಆಗಿದ್ದರೆ ಇಲ್ಲಿನ ಕಂಟ್ರೋಲ್‌ಗಳೂ ಮರೆಯಾಗುತ್ತವೆ
function onVisible() {
  if (document.visibilityState === "visible" && Date.now() - lastCheck > 15_000) checkAdmin();
}

function subscribeAdmin(listener: () => void) {
  adminListeners.add(listener);
  if (adminListeners.size === 1) document.addEventListener("visibilitychange", onVisible);
  if (adminState === null) checkAdmin();
  return () => {
    adminListeners.delete(listener);
    if (adminListeners.size === 0) document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useAdminMode() {
  const isAdmin = useSyncExternalStore(subscribeAdmin, () => adminState === true, () => false);
  return [isAdmin, setAdminMode] as const;
}

export type AdminTab = "add" | "products" | "categories" | "brands";
type PanelState =
  | { open: false }
  | {
      open: true;
      editId: number | string | null;
      tab: AdminTab;
      brandId?: number | null;
      categorySlug?: string | null;
      subcategoryId?: number | null;
      key: number;
    };

export function useAdminPanel() {
  const [panel, setPanel] = useState<PanelState>({ open: false });
  return {
    panel,
    openTab: (tab: AdminTab) => setPanel({ open: true, editId: null, tab, key: Date.now() }),
    openAdd: () => setPanel({ open: true, editId: null, tab: "add", key: Date.now() }),
    openEdit: (id: number | string) => setPanel({ open: true, editId: id, tab: "add", key: Date.now() }),
    // ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಫಾರ್ಮ್, ಈ ಬ್ರಾಂಡ್ ಮೊದಲೇ ಆಯ್ಕೆಯಾಗಿ
    openAddForBrand: (brandId: number) => setPanel({ open: true, editId: null, tab: "add", brandId, key: Date.now() }),
    // ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಫಾರ್ಮ್, ಈ ವರ್ಗ (ಉದಾ: ಬೀಜಗಳು) ಮೊದಲೇ ಆಯ್ಕೆಯಾಗಿ
    openAddForCategory: (categorySlug: string, subcategoryId?: number | null) =>
      setPanel({ open: true, editId: null, tab: "add", categorySlug, subcategoryId: subcategoryId ?? null, key: Date.now() }),
    close: () => setPanel({ open: false }),
  };
}

// ಮುಖಪುಟದ ಮೇಲಿನ "ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್ಸ್" ಪಟ್ಟಿ: ಎಲ್ಲಾ ನಿರ್ವಹಣಾ ಬಟನ್‌ಗಳು ಒಂದೇ ಗುಂಪಿನಲ್ಲಿ
export function AdminBar({ onOpen, onLoggedOut }: { onOpen: (tab: AdminTab) => void; onLoggedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const actions: { tab: AdminTab; icon: React.ComponentType<{ className?: string }>; label: string; primary?: boolean }[] = [
    { tab: "add", icon: Plus, label: "ಹೊಸ ಪ್ರಾಡಕ್ಟ್", primary: true },
    { tab: "products", icon: Package, label: "ಪ್ರಾಡಕ್ಟ್‌ಗಳು" },
    { tab: "categories", icon: LayoutGrid, label: "ವರ್ಗಗಳು" },
    { tab: "brands", icon: BadgeCheck, label: "ಬ್ರಾಂಡ್‌ಗಳು" },
  ];
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
        <p className="flex-1 min-w-0 flex items-center gap-1.5 font-semibold">
          <Settings className="w-4 h-4" /> ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್ಸ್
          <span className="font-normal text-amber-700 hidden sm:inline">— ಗ್ರಾಹಕರಿಗೆ ಕಾಣಿಸುವುದಿಲ್ಲ</span>
        </p>
        {/* ಮೊಬೈಲ್: ಶೀರ್ಷಿಕೆ + Exit ಒಂದು ಸಾಲು, 3 ಬಟನ್‌ಗಳು ಕೆಳಗೆ ಪೂರ್ಣ ಅಗಲ; ದೊಡ್ಡ ಸ್ಕ್ರೀನ್: ಎಲ್ಲವೂ ಒಂದೇ ಸಾಲು */}
        <div className="contents">
          <div role="group" aria-label="ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್ಸ್" className="order-3 md:order-2 w-full md:w-auto grid grid-cols-4 rounded-xl md:rounded-full border border-amber-300 bg-white overflow-hidden divide-x divide-amber-200">
            {actions.map(({ tab, icon: Icon, label, primary }) => (
              <button
                key={tab}
                type="button"
                onClick={() => onOpen(tab)}
                className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1 px-1.5 md:px-3 py-1.5 text-[11px] md:text-xs leading-tight text-center font-semibold md:whitespace-nowrap transition ${
                  primary ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "hover:bg-amber-100"
                }`}
              >
                <Icon className="w-4 h-4 flex-none" /> {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await adminLogoutInline();
              setBusy(false);
              onLoggedOut();
            }}
            title="Exit Admin"
            className="order-2 md:order-3 flex-none flex items-center gap-1 border border-red-200 bg-white text-red-700 hover:bg-red-50 font-semibold px-3 py-1.5 rounded-full text-[11px] sm:text-xs disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">ನಿರ್ಗಮಿಸಿ (Exit Admin)</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ಪ್ರತಿ ಪ್ರಾಡಕ್ಟ್ ಕಾರ್ಡ್‌ನ ಕೆಳಗಿನ ಅಡ್ಮಿನ್ ಬಟನ್‌ಗಳು
export function CardAdminControls({
  product,
  inStock,
  onEdit,
  onChanged,
}: {
  product: { id: number | string; name: string };
  inStock: boolean;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"" | "stock" | "delete">("");

  const toggleStock = async () => {
    setBusy("stock");
    const res = await setProductStock(product.id, !inStock);
    setBusy("");
    const err = (res as { error?: string } | undefined)?.error;
    if (err) return alert("Error: " + err);
    onChanged();
  };

  const remove = async () => {
    const ok = window.confirm(
      `"${product.name}" ಪ್ರಾಡಕ್ಟ್ ಅನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಬೇಕೆ?\n\nಇದರ ಎಲ್ಲಾ ಫೋಟೋಗಳು ಮತ್ತು ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ವಿಡಿಯೋ ಕೂಡ ಅಳಿಸಲ್ಪಡುತ್ತವೆ.`
    );
    if (!ok) return;
    setBusy("delete");
    const res = await deleteProduct(product.id);
    setBusy("");
    const err = (res as { error?: string } | undefined)?.error;
    if (err) return alert("Error: " + err);
    onChanged();
  };

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-amber-300 grid grid-cols-3 gap-1.5" aria-label="ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್‌ಗಳು">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center justify-center gap-1 text-[11px] font-semibold border border-emerald-600 text-emerald-700 rounded-full py-1.5 hover:bg-emerald-50"
      >
        <Pencil className="w-3.5 h-3.5" /> ಎಡಿಟ್
      </button>
      <button
        type="button"
        onClick={toggleStock}
        disabled={busy !== ""}
        title={inStock ? "Out of Stock ಮಾಡಿ" : "In Stock ಮಾಡಿ"}
        className={`text-[11px] font-semibold rounded-full py-1.5 border disabled:opacity-60 ${
          inStock ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700"
        }`}
      >
        {busy === "stock" ? "..." : inStock ? "✅ In Stock" : "⛔ Out"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy !== ""}
        className="flex items-center justify-center gap-1 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-full py-1.5 disabled:opacity-60"
      >
        <Trash2 className="w-3.5 h-3.5" /> {busy === "delete" ? "..." : "ಅಳಿಸಿ"}
      </button>
    </div>
  );
}

// /admin ನ ಅದೇ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಮುಖಪುಟದ ಮೇಲೆ ಪೂರ್ಣ ಪರದೆ ಪ್ಯಾನೆಲ್ ಆಗಿ
export function AdminPanel({
  editId,
  tab = "add",
  brandId = null,
  categorySlug = null,
  subcategoryId = null,
  onClose,
  onProductsChanged,
}: {
  editId: number | string | null;
  tab?: AdminTab;
  brandId?: number | null;
  categorySlug?: string | null;
  subcategoryId?: number | null;
  onClose: () => void;
  onProductsChanged: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label="ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್" className="fixed inset-0 z-[95] bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-emerald-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" /> ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್
          </p>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="hidden sm:flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full">
              <ExternalLink className="w-3.5 h-3.5" /> /admin
            </Link>
            <button type="button" onClick={onClose} aria-label="ಮುಚ್ಚಿ" className="flex items-center gap-1 bg-white text-emerald-800 font-semibold text-sm px-3 py-1.5 rounded-full">
              <X className="w-4 h-4" /> ಸ್ಟೋರ್‌ಗೆ ಹಿಂತಿರುಗಿ
            </button>
          </div>
        </div>
      </div>
      <AdminDashboard embedded initialEditId={editId} initialTab={tab} initialBrandId={brandId} initialCategory={categorySlug} initialSubcategory={subcategoryId} onProductsChanged={onProductsChanged} />
    </div>
  );
}
