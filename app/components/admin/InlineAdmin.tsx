"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, LogOut, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import AdminDashboard from "../../admin/AdminDashboard";
import { adminLogoutInline, adminStatus, deleteProduct, setProductStock } from "../../admin/actions";

// ಮುಖಪುಟದ ಇನ್‌ಲೈನ್ ಅಡ್ಮಿನ್ ಮೋಡ್: ಅಡ್ಮಿನ್ ಲಾಗಿನ್ ಆಗಿದ್ದರೆ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ.
// ಎಲ್ಲಾ ಬದಲಾವಣೆಗಳನ್ನು ಸರ್ವರ್ ಮತ್ತೆ ಅಡ್ಮಿನ್ ಕುಕೀಯಿಂದ ಪರಿಶೀಲಿಸುತ್ತದೆ; ಇಲ್ಲಿನ ಸ್ಥಿತಿ UI ತೋರಿಸಲು ಮಾತ್ರ.

export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    adminStatus()
      .then((r) => active && setIsAdmin(Boolean(r?.isAdmin)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return [isAdmin, setIsAdmin] as const;
}

type PanelState = { open: false } | { open: true; editId: number | string | null; key: number };

export function useAdminPanel() {
  const [panel, setPanel] = useState<PanelState>({ open: false });
  return {
    panel,
    openAdd: () => setPanel({ open: true, editId: null, key: Date.now() }),
    openEdit: (id: number | string) => setPanel({ open: true, editId: id, key: Date.now() }),
    close: () => setPanel({ open: false }),
  };
}

export function AdminBar({ onAdd, onOpenPanel, onLoggedOut }: { onAdd: () => void; onOpenPanel: () => void; onLoggedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 justify-between text-sm">
        <p className="flex items-center gap-1.5 font-semibold">
          <Settings className="w-4 h-4" /> ಅಡ್ಮಿನ್ ಮೋಡ್
          <span className="font-normal text-amber-700 hidden sm:inline">— ಈ ಕಂಟ್ರೋಲ್‌ಗಳು ಗ್ರಾಹಕರಿಗೆ ಕಾಣಿಸುವುದಿಲ್ಲ</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-full text-xs"
          >
            <Plus className="w-4 h-4" /> ಹೊಸ ಪ್ರಾಡಕ್ಟ್
          </button>
          <button
            type="button"
            onClick={onOpenPanel}
            className="flex items-center gap-1 bg-white border border-amber-300 hover:bg-amber-100 font-semibold px-3 py-1.5 rounded-full text-xs"
          >
            <Settings className="w-4 h-4" /> ಪೂರ್ಣ ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await adminLogoutInline();
              setBusy(false);
              onLoggedOut();
            }}
            className="flex items-center gap-1 text-red-700 hover:bg-red-50 font-semibold px-3 py-1.5 rounded-full text-xs"
          >
            <LogOut className="w-4 h-4" /> ಅಡ್ಮಿನ್ ಲಾಗ್‌ಔಟ್
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
  onClose,
  onProductsChanged,
}: {
  editId: number | string | null;
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
        <div className="max-w-[800px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
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
      <AdminDashboard embedded initialEditId={editId} onProductsChanged={onProductsChanged} />
    </div>
  );
}
