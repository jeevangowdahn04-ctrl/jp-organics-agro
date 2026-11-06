"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  IMAGE_TYPES,
  MAX_IMAGES,
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET,
  VIDEO_TYPES,
  getProductImages,
  getYouTubeId,
  isOurStorageUrl,
} from "@/lib/media";
import { discountPercent, highlightLines, isInStock } from "@/lib/pricing";
import CategoryLogosManager from "../components/categories/CategoryLogosManager";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { BadgeCheck, LayoutGrid, LogOut, Package, Pencil, PlusCircle, Search, Settings, Trash2 } from "lucide-react";
import BrandsManager from "../components/brands/BrandsManager";
import SubcategoriesManager from "../components/subcategories/SubcategoriesManager";
import { refreshSubcategories, useSubcategories } from "../components/subcategories/useSubcategories";
import { refreshBrands, useBrands } from "../components/brands/useBrands";
import QuickAddBrand from "../components/brands/QuickAddBrand";
import { addProduct, createUploadUrl, deleteProduct, discardUploads, logout, setProductStock, updateProduct } from "./actions";

const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "bold" };
const hintStyle = { margin: "4px 0 0 0", fontSize: "12px", color: "#777" };
const smallButton = { padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" };

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: false });
  return !error && data ? data : null;
}

// ಸರ್ವರ್‌ನಿಂದ signed URL ಪಡೆದು ಫೈಲ್ ಅನ್ನು ನೇರವಾಗಿ Supabase Storage ಗೆ ಅಪ್‌ಲೋಡ್ ಮಾಡುವುದು
async function uploadFile(file) {
  const signed = await createUploadUrl({ contentType: file.type, size: file.size });
  if (signed.error) throw new Error(signed.error);
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return signed.publicUrl;
}

let nextKey = 0;
// ಫೋಟೋ ಪಟ್ಟಿಯ ಒಂದು ಐಟಂ: ಈಗಾಗಲೇ ಸೇವ್ ಆಗಿರುವ URL ಅಥವಾ ಹೊಸದಾಗಿ ಆಯ್ಕೆ ಮಾಡಿದ ಫೈಲ್
const fromUrl = (url) => ({ key: `k${nextKey++}`, url, preview: url });
const fromFile = (file) => ({ key: `k${nextKey++}`, file, preview: URL.createObjectURL(file) });
const releasePreview = (img) => img.file && URL.revokeObjectURL(img.preview);

// embedded: ಮುಖಪುಟದ ಇನ್‌ಲೈನ್ ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್ ಒಳಗೆ (ಸ್ವಂತ ಹೆಡರ್/ಲಾಗ್‌ಔಟ್ ಇಲ್ಲ)
// initialEditId: ತೆರೆದ ತಕ್ಷಣ ಈ ಪ್ರಾಡಕ್ಟ್ ಎಡಿಟ್ ಮೋಡ್‌ನಲ್ಲಿ; onProductsChanged: ಸೇರಿಸು/ಎಡಿಟ್/ಅಳಿಸು ನಂತರ ತಿಳಿಸುವುದು
// initialTab: "add" (ಹೊಸ ಪ್ರಾಡಕ್ಟ್ / ಎಡಿಟ್ ಫಾರ್ಮ್) | "products" (ಪಟ್ಟಿ: ಎಡಿಟ್, ಸ್ಟಾಕ್, ಅಳಿಸಿ) | "categories" (ವರ್ಗಗಳ ಲೋಗೋ) | "brands" (ಬ್ರಾಂಡ್‌ಗಳು)
/** @param {{ embedded?: boolean, initialEditId?: string | number | null, initialTab?: "add" | "products" | "categories" | "brands", initialBrandId?: number | null, initialCategory?: string | null, initialSubcategory?: number | null, onProductsChanged?: () => void }} [props] */
// initialBrandId: "ಈ ಬ್ರಾಂಡ್‌ಗೆ ಹೊಸ ಪ್ರಾಡಕ್ಟ್" ಬಟನ್‌ನಿಂದ ಬಂದಾಗ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಆ ಬ್ರಾಂಡ್ ಮೊದಲೇ ಆಯ್ಕೆ
export default function AdminDashboard({ embedded = false, initialEditId = null, initialTab = "add", initialBrandId = null, initialCategory = null, initialSubcategory = null, onProductsChanged } = {}) {
  // "+ ಈ ವರ್ಗಕ್ಕೆ ಹೊಸ ಪ್ರಾಡಕ್ಟ್" ಬಟನ್‌ನಿಂದ ಬಂದಾಗ ಆ ವರ್ಗ ಮೊದಲೇ ಆಯ್ಕೆ
  const startCategory = CATEGORIES.find((c) => c.slug === initialCategory) ?? null;
  const [tab, setTab] = useState(initialEditId != null ? "add" : initialTab);
  const [listQuery, setListQuery] = useState("");
  const [stockBusyId, setStockBusyId] = useState(null);
  const [brandId, setBrandId] = useState(initialBrandId != null ? String(initialBrandId) : "");
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategory != null ? String(initialSubcategory) : "");
  const subcategories = useSubcategories();
  const brands = useBrands();
  // ಫಾರ್ಮ್ ಒಳಗೇ ಹೊಸ ಬ್ರಾಂಡ್ ಸೇರಿಸುವ ಸಣ್ಣ ಬಾಕ್ಸ್
  const [quickBrand, setQuickBrand] = useState(false);
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [category, setCategory] = useState(startCategory?.kn ?? "");
  const [weight, setWeight] = useState("");
  const [inStock, setInStock] = useState(true);
  const [highlights, setHighlights] = useState("");
  const [description, setDescription] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryEn, setCategoryEn] = useState(startCategory?.en ?? "");
  const [highlightsEn, setHighlightsEn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [contentLang, setContentLang] = useState("kn");
  const [images, setImages] = useState([]);
  const [videoMode, setVideoMode] = useState("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [existingVideo, setExistingVideo] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const formRef = useRef(null);

  const refreshProducts = async () => {
    const data = await loadProducts();
    if (data) setProducts(data);
    onProductsChanged?.();
  };
  const initialEditDone = useRef(false);


  const addImageFiles = (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const accepted = [];
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) {
        alert(`${file.name}: ಈ ಫೈಲ್ ಪ್ರಕಾರ ಬೆಂಬಲಿತವಲ್ಲ.`);
      } else if (file.size > MAX_UPLOAD_BYTES) {
        alert(`${file.name}: ಫೈಲ್ ಗಾತ್ರ 50MB ಗಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.`);
      } else {
        accepted.push(file);
      }
    }
    const room = MAX_IMAGES - images.length;
    if (accepted.length > room) {
      alert(`ಗರಿಷ್ಠ ${MAX_IMAGES} ಫೋಟೋಗಳು ಮಾತ್ರ. ಮೊದಲ ${Math.max(room, 0)} ಫೋಟೋಗಳನ್ನು ಸೇರಿಸಲಾಗಿದೆ.`);
    }
    if (room > 0) setImages((prev) => [...prev, ...accepted.slice(0, room).map(fromFile)]);
  };

  const removeImage = (key) => {
    setImages((prev) => {
      const target = prev.find((img) => img.key === key);
      if (target) releasePreview(target);
      return prev.filter((img) => img.key !== key);
    });
  };

  // ಫೋಟೋ ಕ್ರಮ ಬದಲಿಸುವುದು (ಮೊದಲ ಫೋಟೋ = ಮುಖ್ಯ/cover ಫೋಟೋ)
  const moveImage = (key, dir) => {
    setImages((prev) => {
      const i = prev.findIndex((img) => img.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const pickVideo = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !VIDEO_TYPES.includes(file.type)) {
      alert("ಈ ಫೈಲ್ ಪ್ರಕಾರ ಬೆಂಬಲಿತವಲ್ಲ.");
      e.target.value = "";
      return setVideoFile(null);
    }
    if (file && file.size > MAX_UPLOAD_BYTES) {
      alert("ಫೈಲ್ ಗಾತ್ರ 50MB ಗಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.");
      e.target.value = "";
      return setVideoFile(null);
    }
    setVideoFile(file);
  };

  const resetForm = () => {
    images.forEach(releasePreview);
    setEditingId(null);
    setName("");
    setPrice("");
    setMrp("");
    setCategory("");
    setWeight("");
    setInStock(true);
    setHighlights("");
    setDescription("");
    setNameEn("");
    setCategoryEn("");
    setBrandId("");
    setSubcategoryId("");
    setHighlightsEn("");
    setDescriptionEn("");
    setContentLang("kn");
    setImages([]);
    setVideoMode("youtube");
    setYoutubeUrl("");
    setVideoFile(null);
    setExistingVideo("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const startEdit = (p) => {
    images.forEach(releasePreview);
    setEditingId(p.id);
    setName(p.name ?? "");
    setPrice(p.price ?? "");
    setMrp(p.mrp ?? "");
    setCategory(p.category ?? "");
    setWeight(p.weight ?? "");
    setInStock(isInStock(p));
    setHighlights(highlightLines(p.highlights).join("\n"));
    setDescription(p.description ?? "");
    setNameEn(p.name_en ?? "");
    setCategoryEn(p.category_en ?? "");
    setBrandId(p.brand_id != null ? String(p.brand_id) : "");
    setSubcategoryId(p.subcategory_id != null ? String(p.subcategory_id) : "");
    setHighlightsEn(highlightLines(p.highlights_en).join("\n"));
    setDescriptionEn(p.description_en ?? "");
    setContentLang("kn");
    setImages(getProductImages(p).map(fromUrl));
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (p.video_url && isOurStorageUrl(p.video_url)) {
      setVideoMode("upload");
      setExistingVideo(p.video_url);
      setYoutubeUrl("");
    } else {
      setVideoMode("youtube");
      setExistingVideo("");
      setYoutubeUrl(p.video_url ?? "");
    }
    setTab("add");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  // ಬ್ರಾಂಡ್ ಡ್ರಾಪ್‌ಡೌನ್‌ನಲ್ಲಿ ಎಲ್ಲಾ (ಇತ್ತೀಚೆಗೆ ಸೇರಿಸಿದ) ಬ್ರಾಂಡ್‌ಗಳು ಕಾಣಿಸಲು, ತೆರೆದಾಗ ಪಟ್ಟಿಯನ್ನು ಮತ್ತೆ ತರುವುದು
  useEffect(() => {
    refreshBrands();
    refreshSubcategories();
  }, []);

  // Supabase ನಿಂದ ಪ್ರಾಡಕ್ಟ್‌ಗಳ ಪಟ್ಟಿ ಪಡೆಯುವುದು
  useEffect(() => {
    let active = true;
    loadProducts().then((data) => {
      if (!active || !data) return;
      setProducts(data);
      // ಮುಖಪುಟದ ಕಾರ್ಡ್‌ನ "Edit" ಒತ್ತಿ ಬಂದಿದ್ದರೆ ಆ ಪ್ರಾಡಕ್ಟ್ ಅನ್ನು ನೇರವಾಗಿ ಎಡಿಟ್‌ಗೆ
      const target = initialEditId != null ? data.find((p) => String(p.id) === String(initialEditId)) : null;
      if (target && !initialEditDone.current) {
        initialEditDone.current = true;
        startEdit(target);
      }
    });
    return () => {
      active = false;
    };
    // ತೆರೆದಾಗ ಒಮ್ಮೆ ಮಾತ್ರ (initialEditId ಮೊದಲ ಬಾರಿಗೆ ಮಾತ್ರ ಬಳಕೆ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (p) => {
    const ok = window.confirm(
      `"${p.name}" ಪ್ರಾಡಕ್ಟ್ ಅನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಬೇಕೆ?\n\nಇದರ ಎಲ್ಲಾ ಫೋಟೋಗಳು ಮತ್ತು ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ವಿಡಿಯೋ ಕೂಡ ಅಳಿಸಲ್ಪಡುತ್ತವೆ. ಇದನ್ನು ಹಿಂಪಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.`
    );
    if (!ok) return;
    setDeletingId(p.id);
    const { error } = await deleteProduct(p.id);
    setDeletingId(null);
    if (error) return alert("Error: " + error);
    if (editingId === p.id) resetForm();
    refreshProducts();
  };

  // In Stock <-> Out of Stock
  const toggleStock = async (p) => {
    setStockBusyId(p.id);
    const res = await setProductStock(p.id, !isInStock(p));
    setStockBusyId(null);
    if (res?.error) return alert("Error: " + res.error);
    refreshProducts();
  };

  // ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು ಅಥವಾ ಎಡಿಟ್ ಮಾಡಿದ್ದನ್ನು ಸೇವ್ ಮಾಡುವುದು
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (videoMode === "youtube" && youtubeUrl.trim() && !getYouTubeId(youtubeUrl)) {
      alert("ಸರಿಯಾದ YouTube ಲಿಂಕ್ ಹಾಕಿ.");
      return;
    }
    if (!name.trim() && !nameEn.trim()) {
      alert("ಕನ್ನಡ ಅಥವಾ English ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಪ್ರಾಡಕ್ಟ್ ಹೆಸರು ನಮೂದಿಸಿ.");
      setContentLang("kn");
      return;
    }
    if (mrp !== "" && Number(mrp) < Number(price)) {
      alert("MRP (ಮೂಲ ಬೆಲೆ) ಆಫರ್ ಬೆಲೆಗಿಂತ ಕಡಿಮೆ ಇರಬಾರದು.");
      return;
    }

    setLoading(true);
    const uploaded = [];
    try {
      const newFiles = images.filter((img) => img.file);
      const imageUrls = [];
      let done = 0;
      for (const img of images) {
        if (img.file) {
          setStatus(`ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ... (${++done}/${newFiles.length})`);
          const url = await uploadFile(img.file);
          uploaded.push(url);
          imageUrls.push(url);
        } else {
          imageUrls.push(img.url);
        }
      }

      let videoUrl = "";
      if (videoMode === "youtube") {
        videoUrl = youtubeUrl.trim();
      } else if (videoFile) {
        setStatus("ವಿಡಿಯೋ ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ... (ದೊಡ್ಡ ಫೈಲ್‌ಗೆ ಸ್ವಲ್ಪ ಸಮಯ ಬೇಕು)");
        videoUrl = await uploadFile(videoFile);
        uploaded.push(videoUrl);
      } else {
        videoUrl = existingVideo;
      }

      setStatus("ಪ್ರಾಡಕ್ಟ್ ಸೇವ್ ಆಗುತ್ತಿದೆ...");
      const payload = {
        name, nameEn, price, mrp, category, categoryEn, brandId, subcategoryId, weight, inStock,
        highlights, highlightsEn, description, descriptionEn, imageUrls, videoUrl,
      };
      const { error } = editingId ? await updateProduct(editingId, payload) : await addProduct(payload);
      if (error) throw new Error(error);

      alert(editingId ? "ಪ್ರಾಡಕ್ಟ್ ಅಪ್‌ಡೇಟ್ ಆಗಿದೆ!" : "ಪ್ರಾಡಕ್ಟ್ ಯಶಸ್ವಿಯಾಗಿ ಸೇವ್ ಆಗಿದೆ!");
      resetForm();
      refreshProducts();
      setTab("products");
    } catch (err) {
      // ಸೇವ್ ವಿಫಲವಾದರೆ ಈಗಷ್ಟೇ ಅಪ್‌ಲೋಡ್ ಆದ ಫೈಲ್‌ಗಳನ್ನು Storage ನಲ್ಲಿ ಉಳಿಸಬಾರದು
      if (uploaded.length) await discardUploads(uploaded);
      alert("Error: " + err.message);
    } finally {
      setStatus("");
      setLoading(false);
    }
  };

  const tabs = [
    { id: "add", icon: PlusCircle, label: editingId ? `ಎಡಿಟ್ #${editingId}` : "ಹೊಸ ಪ್ರಾಡಕ್ಟ್", sub: editingId ? "Edit" : "Add Product" },
    { id: "products", icon: Package, label: `ಪ್ರಾಡಕ್ಟ್‌ಗಳು (${products.length})`, sub: "Edit · Stock · Delete" },
    { id: "categories", icon: LayoutGrid, label: "ವರ್ಗಗಳು", sub: "Logos · Subcategories" },
    { id: "brands", icon: BadgeCheck, label: `ಬ್ರಾಂಡ್‌ಗಳು (${brands?.length ?? 0})`, sub: "Brands" },
  ];
  const brandName = (id) => (brands ?? []).find((b) => b.id === id)?.name;
  const brandCounts = products.reduce((acc, p) => {
    if (p.brand_id != null) acc[p.brand_id] = (acc[p.brand_id] ?? 0) + 1;
    return acc;
  }, {});
  const q = listQuery.trim().toLowerCase();
  const listed = q
    ? products.filter((p) => [p.name, p.name_en, p.category, p.category_en].some((v) => v && String(v).toLowerCase().includes(q)))
    : products;

  return (
    <div className={`max-w-4xl mx-auto font-sans text-slate-900 ${embedded ? "px-3 sm:px-4 py-4" : "px-3 sm:px-5 py-6 sm:py-10"}`}>
      {!embedded && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-emerald-800">JP Organics – Admin</h1>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-1.5 text-sm font-semibold border border-emerald-700 text-emerald-800 rounded-full px-3 py-1.5 hover:bg-emerald-50">
              <LogOut className="w-4 h-4" /> ಲಾಗ್‌ಔಟ್
            </button>
          </form>
        </div>
      )}

      {/* ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್ಸ್: ಎಲ್ಲಾ ನಿರ್ವಹಣೆ ಒಂದೇ ಕಾರ್ಡ್‌ನಲ್ಲಿ, 3 ಟ್ಯಾಬ್‌ಗಳು */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-emerald-50/60 border-b border-slate-200">
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" /> ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್ಸ್
            <span className="text-xs font-normal text-slate-500">Admin Controls</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು, ಎಡಿಟ್, ಸ್ಟಾಕ್, ಅಳಿಸುವುದು, ವರ್ಗಗಳ ಲೋಗೋ ಮತ್ತು ಬ್ರಾಂಡ್‌ಗಳು – ಎಲ್ಲವೂ ಇಲ್ಲೇ.</p>
        </div>

        <div role="tablist" aria-label="ಅಡ್ಮಿನ್ ಕಂಟ್ರೋಲ್ಸ್" className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200">
          {tabs.map(({ id, icon: Icon, label, sub }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 py-2.5 sm:py-3 border-b-2 -mb-px text-center transition ${
                  active ? "border-emerald-600 text-emerald-800 bg-white" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-5 h-5 flex-none" />
                <span className="min-w-0">
                  <span className="block text-xs sm:text-sm font-bold leading-tight">{label}</span>
                  <span className="hidden sm:block text-[11px] font-normal text-slate-400">{sub}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 sm:p-5">
      {tab === "add" && (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{ background: editingId ? "#fff8e1" : "#f9f9f9", border: editingId ? "1px solid #ffe082" : "none", padding: "16px", borderRadius: "12px", scrollMarginTop: "80px" }}>
        <h3 style={{ marginTop: 0 }}>
          {editingId ? `ಪ್ರಾಡಕ್ಟ್ ಎಡಿಟ್ ಮಾಡಿ (Edit Product #${editingId})` : "ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ (Add Product)"}
        </h3>
        {/* ಕನ್ನಡ / English ಮಾಹಿತಿ: ಒಂದೇ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಟ್ಯಾಬ್ ಬದಲಿಸಿ ಭರ್ತಿ ಮಾಡುವುದು */}
        <div style={{ border: "1px solid #c8e6c9", borderRadius: "8px", background: "white", marginBottom: "14px" }}>
          <div role="tablist" style={{ display: "flex", borderBottom: "1px solid #c8e6c9" }}>
            {[
              { code: "kn", label: "ಕನ್ನಡ", filled: name.trim() },
              { code: "en", label: "English", filled: nameEn.trim() },
            ].map((tab) => (
              <button
                key={tab.code}
                type="button"
                role="tab"
                aria-selected={contentLang === tab.code}
                onClick={() => setContentLang(tab.code)}
                style={{
                  flex: 1, padding: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
                  background: contentLang === tab.code ? "#2e7d32" : "transparent",
                  color: contentLang === tab.code ? "white" : "#2e7d32",
                  borderRadius: tab.code === "kn" ? "8px 0 0 0" : "0 8px 0 0",
                }}>
                {tab.label} {tab.filled ? "✓" : ""}
              </button>
            ))}
          </div>
          <div style={{ padding: "14px" }}>
            <p style={{ ...hintStyle, marginTop: 0, marginBottom: "10px" }}>
              {contentLang === "kn"
                ? "ಕನ್ನಡದಲ್ಲಿ ಮಾಹಿತಿ. ಗ್ರಾಹಕರು ಕನ್ನಡ ಆಯ್ಕೆ ಮಾಡಿದಾಗ ಕಾಣಿಸುತ್ತದೆ."
                : "English details, shown when customers choose English."}{" "}
              ಒಂದು ಭಾಷೆ ಖಾಲಿ ಇದ್ದರೆ ಇನ್ನೊಂದು ಭಾಷೆಯ ಮಾಹಿತಿ ಕಾಣಿಸುತ್ತದೆ.
            </p>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="productName" style={labelStyle}>{contentLang === "kn" ? "ಪ್ರಾಡಕ್ಟ್ ಹೆಸರು (ಕನ್ನಡ):" : "Product Name (English):"}</label>
              <input
                id="productName"
                type="text"
                value={contentLang === "kn" ? name : nameEn}
                onChange={(e) => (contentLang === "kn" ? setName : setNameEn)(e.target.value)}
                placeholder={contentLang === "kn" ? "ಉದಾ: ಆಗ್ರೋ ಸೂಕ್ಷ್ಮ ಪೋಷಕಾಂಶಗಳು" : "e.g. Agro Micronutrients"}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="productCategory" style={labelStyle}>ವರ್ಗ / Category:</label>
              {(() => {
                const matched = categoryOf({ category, category_en: categoryEn });
                const legacy = !matched && (category || categoryEn) ? category || categoryEn : "";
                return (
                  <select
                    id="productCategory"
                    value={matched ? matched.slug : legacy ? "__legacy" : ""}
                    onChange={(e) => {
                      const cat = CATEGORIES.find((c) => c.slug === e.target.value);
                      if (cat) {
                        setCategory(cat.kn);
                        setCategoryEn(cat.en);
                      } else if (e.target.value === "") {
                        setCategory("");
                        setCategoryEn("");
                      }
                      // ವರ್ಗ ಬದಲಾದರೆ ಹಳೆಯ ವರ್ಗದ ಉಪವರ್ಗ ಬೇಡ
                      const keep = (subcategories ?? []).find((s) => String(s.id) === subcategoryId);
                      if (!keep || keep.category_slug !== e.target.value) setSubcategoryId("");
                    }}
                    style={inputStyle}
                  >
                    <option value="">-- ವರ್ಗ ಆಯ್ಕೆ ಮಾಡಿ / Choose category --</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.kn} / {c.en}
                      </option>
                    ))}
                    {legacy && <option value="__legacy">(ಹಳೆಯ ವರ್ಗ) {legacy}</option>}
                  </select>
                );
              })()}
              <p style={hintStyle}>ಮುಖಪುಟದ 6 ವರ್ಗಗಳಲ್ಲಿ ಒಂದನ್ನು ಆರಿಸಿ; ಕನ್ನಡ ಮತ್ತು English ಹೆಸರು ಎರಡೂ ತಾನಾಗಿ ಸೇರುತ್ತವೆ.</p>
            </div>
            {(() => {
              const slugNow = categoryOf({ category, category_en: categoryEn })?.slug;
              if (!slugNow || slugNow === "brands") return null;
              const options = (subcategories ?? []).filter((s) => s.category_slug === slugNow);
              return (
                <div style={{ marginBottom: "12px" }}>
                  <label htmlFor="productSubcategory" style={labelStyle}>ಉಪವರ್ಗ / Subcategory:</label>
                  <select id="productSubcategory" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} style={inputStyle}>
                    <option value="">-- ಉಪವರ್ಗ ಇಲ್ಲ / No subcategory --</option>
                    {options.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                        {s.name_en ? ` / ${s.name_en}` : ""}
                      </option>
                    ))}
                  </select>
                  <p style={hintStyle}>
                    {options.length === 0 ? "ಈ ವರ್ಗಕ್ಕೆ ಇನ್ನೂ ಉಪವರ್ಗ ಇಲ್ಲ. " : "ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲವೇ? "}
                    <button type="button" onClick={() => setTab("categories")} className="text-emerald-700 font-semibold underline">
                      ಉಪವರ್ಗ ಸೇರಿಸಿ
                    </button>{" "}
                    (ಈ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಹಾಕಿದ್ದು ಉಳಿಯುತ್ತದೆ)
                  </p>
                </div>
              );
            })()}
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="productBrand" style={labelStyle}>ಬ್ರಾಂಡ್ / Brand:</label>
              <div className="flex gap-2">
                <select
                  id="productBrand"
                  value={brandId}
                  onChange={(e) => {
                    if (e.target.value === "__new") return setQuickBrand(true);
                    setBrandId(e.target.value);
                  }}
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                >
                  <option value="">-- ಬ್ರಾಂಡ್ ಇಲ್ಲ / No brand --</option>
                  {(brands ?? []).map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                  {brandId && brands && !brands.some((b) => String(b.id) === brandId) && <option value={brandId}>(ಅಳಿಸಿದ ಬ್ರಾಂಡ್ #{brandId})</option>}
                  <option value="__new">+ ಹೊಸ ಬ್ರಾಂಡ್ ಸೇರಿಸಿ / Add new brand</option>
                </select>
                <button
                  type="button"
                  onClick={() => setQuickBrand((v) => !v)}
                  aria-expanded={quickBrand}
                  className="flex-none whitespace-nowrap rounded border border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 font-semibold text-sm px-3"
                >
                  + ಹೊಸ ಬ್ರಾಂಡ್
                </button>
              </div>
              <QuickAddBrand
                open={quickBrand}
                brands={brands}
                onClose={() => setQuickBrand(false)}
                onCreated={(id) => setBrandId(String(id))}
              />
              <p style={hintStyle}>
                ಬ್ರಾಂಡ್ ಆರಿಸಿದರೆ ಗ್ರಾಹಕರು ವರ್ಗ + ಬ್ರಾಂಡ್ ಎರಡರಿಂದಲೂ ಈ ಪ್ರಾಡಕ್ಟ್ ಹುಡುಕಬಹುದು. ಲೋಗೋ ಬದಲಿಸಲು{" "}
                <button type="button" onClick={() => setTab("brands")} className="text-emerald-700 font-semibold underline">
                  ಬ್ರಾಂಡ್‌ಗಳು
                </button>{" "}
                ಟ್ಯಾಬ್ (ಈ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಹಾಕಿದ್ದು ಉಳಿಯುತ್ತದೆ)
              </p>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="productHighlights" style={labelStyle}>{contentLang === "kn" ? "ಮುಖ್ಯಾಂಶಗಳು (ಕನ್ನಡ):" : "Key Highlights (English):"}</label>
              <textarea
                id="productHighlights"
                value={contentLang === "kn" ? highlights : highlightsEn}
                onChange={(e) => (contentLang === "kn" ? setHighlights : setHighlightsEn)(e.target.value)}
                rows="4"
                placeholder={
                  contentLang === "kn"
                    ? "ಪ್ರತಿ ಸಾಲು ಒಂದು ಅಂಶ, ಉದಾ:\nತೆಂಗು, ಅಡಿಕೆ ಬೆಳೆಗಳಿಗೆ ಸೂಕ್ತ\nಬೇರಿನ ಬೆಳವಣಿಗೆ ಹೆಚ್ಚಿಸುತ್ತದೆ\nಬಳಕೆ: 1 ಲೀಟರ್ ನೀರಿಗೆ 2 ml"
                    : "One point per line, e.g.:\nSuitable for coconut and arecanut\nImproves root growth\nUsage: 2 ml per litre of water"
                }
                style={inputStyle}
              />
              <p style={hintStyle}>ಪ್ರಾಡಕ್ಟ್ ಪುಟದಲ್ಲಿ ಬುಲೆಟ್ ಪಾಯಿಂಟ್‌ಗಳಾಗಿ ಕಾಣಿಸುತ್ತದೆ.</p>
            </div>
            <div>
              <label htmlFor="productDescription" style={labelStyle}>{contentLang === "kn" ? "ವಿವರಣೆ (ಕನ್ನಡ):" : "Description (English):"}</label>
              <textarea
                id="productDescription"
                value={contentLang === "kn" ? description : descriptionEn}
                onChange={(e) => (contentLang === "kn" ? setDescription : setDescriptionEn)(e.target.value)}
                rows="4"
                placeholder={contentLang === "kn" ? "ಪ್ರಾಡಕ್ಟ್ ವಿವರಣೆ, ಬಳಕೆಯ ವಿಧಾನ, ಘಟಕಾಂಶಗಳು..." : "Product description, how to use, ingredients..."}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="productWeight" style={labelStyle}>ಪ್ಯಾಕಿಂಗ್ (Packing):</label>
            <input
              id="productWeight"
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="ಉದಾ: 1 Litre / 5 Kg"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "6px" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="productMrp" style={labelStyle}>ಮೂಲ ಬೆಲೆ / MRP (₹):</label>
            <input
              id="productMrp"
              type="number"
              min="0"
              step="0.01"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              placeholder="ಉದಾ: 800 (ಐಚ್ಛಿಕ)"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="productPrice" style={labelStyle}>ಆಫರ್ / ಮಾರಾಟ ಬೆಲೆ (₹):</label>
            <input
              id="productPrice"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="ಉದಾ: 600"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="productStock" style={labelStyle}>ಸ್ಟಾಕ್ ಸ್ಥಿತಿ:</label>
            <select
              id="productStock"
              value={inStock ? "in" : "out"}
              onChange={(e) => setInStock(e.target.value === "in")}
              style={{ ...inputStyle, background: inStock ? "#e8f5e9" : "#ffebee", fontWeight: "bold", color: inStock ? "#2e7d32" : "#c62828" }}>
              <option value="in">✅ In Stock</option>
              <option value="out">⛔ Out of Stock</option>
            </select>
          </div>
        </div>
        <p style={{ ...hintStyle, marginBottom: "12px", fontSize: "13px" }}>
          {mrp !== "" && price !== "" && Number(mrp) < Number(price) ? (
            <span style={{ color: "#c62828", fontWeight: "bold" }}>⚠ MRP ಆಫರ್ ಬೆಲೆಗಿಂತ ಕಡಿಮೆ ಇರಬಾರದು.</span>
          ) : discountPercent(price, mrp) > 0 ? (
            <span>
              ಗ್ರಾಹಕರಿಗೆ ಕಾಣುವುದು: <b style={{ fontSize: "15px", color: "#111" }}>₹{price}</b>{" "}
              <s>₹{mrp}</s>{" "}
              <b style={{ background: "#c62828", color: "white", padding: "1px 6px", borderRadius: "4px" }}>{discountPercent(price, mrp)}% OFF</b>
            </span>
          ) : (
            "MRP ಹಾಕಿದರೆ ರಿಯಾಯಿತಿ (% OFF) ತಾನಾಗೇ ಲೆಕ್ಕವಾಗಿ ಕಾಣಿಸುತ್ತದೆ."
          )}
        </p>
        <div style={{ marginBottom: "12px" }}>
          <label htmlFor="productImages" style={labelStyle}>
            ಪ್ರಾಡಕ್ಟ್ ಫೋಟೋಗಳು (Images) — {images.length}/{MAX_IMAGES}
          </label>
          <input
            id="productImages"
            ref={imageInputRef}
            type="file"
            multiple
            accept={IMAGE_TYPES.join(",")}
            onChange={addImageFiles}
            disabled={images.length >= MAX_IMAGES}
          />
          <p style={hintStyle}>ಒಮ್ಮೆಗೆ ಹಲವು ಫೋಟೋ ಆಯ್ಕೆ ಮಾಡಬಹುದು. ಮೊದಲ ಫೋಟೋ ಮುಖ್ಯ (cover) ಫೋಟೋ. JPG / PNG / WebP / GIF, ಪ್ರತಿ ಫೋಟೋ ಗರಿಷ್ಠ 50MB</p>
          {images.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
              {images.map((img, i) => (
                <div key={img.key} style={{ position: "relative", width: "96px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={`ಫೋಟೋ ${i + 1}`}
                    style={{ width: "96px", height: "96px", objectFit: "cover", borderRadius: "6px", border: i === 0 ? "2px solid #2e7d32" : "1px solid #ddd" }}
                  />
                  {i === 0 && (
                    <span style={{ position: "absolute", top: "4px", left: "4px", background: "#2e7d32", color: "white", fontSize: "10px", padding: "1px 5px", borderRadius: "8px" }}>
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    aria-label={`ಫೋಟೋ ${i + 1} ತೆಗೆದುಹಾಕಿ`}
                    style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.65)", color: "white", cursor: "pointer", fontSize: "13px", lineHeight: "22px", padding: 0 }}>
                    ×
                  </button>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                    <button type="button" onClick={() => moveImage(img.key, -1)} disabled={i === 0} aria-label="ಎಡಕ್ಕೆ ಸರಿಸಿ" style={{ border: "1px solid #ccc", background: "white", borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "1px 8px" }}>◀</button>
                    <button type="button" onClick={() => moveImage(img.key, 1)} disabled={i === images.length - 1} aria-label="ಬಲಕ್ಕೆ ಸರಿಸಿ" style={{ border: "1px solid #ccc", background: "white", borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "1px 8px" }}>▶</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "12px" }}>
          <span style={labelStyle}>ಪ್ರಾಡಕ್ಟ್ ವಿಡಿಯೋ (Video):</span>
          <div style={{ display: "flex", gap: "16px", marginBottom: "8px", fontSize: "14px" }}>
            <label>
              <input type="radio" name="videoMode" value="youtube" checked={videoMode === "youtube"} onChange={() => setVideoMode("youtube")} />{" "}
              YouTube ಲಿಂಕ್
            </label>
            <label>
              <input type="radio" name="videoMode" value="upload" checked={videoMode === "upload"} onChange={() => setVideoMode("upload")} />{" "}
              ವಿಡಿಯೋ ಅಪ್‌ಲೋಡ್
            </label>
          </div>
          {videoMode === "youtube" ? (
            <input
              type="url"
              aria-label="YouTube ಲಿಂಕ್"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... (ಖಾಲಿ ಬಿಟ್ಟರೆ ವಿಡಿಯೋ ಇಲ್ಲ)"
              style={inputStyle}
            />
          ) : (
            <>
              {existingVideo && !videoFile && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", fontSize: "13px" }}>
                  <video src={existingVideo} style={{ width: "160px", borderRadius: "6px", background: "#000" }} controls preload="metadata" />
                  <button type="button" onClick={() => setExistingVideo("")} style={{ ...smallButton, background: "white", color: "#c62828", border: "1px solid #c62828" }}>
                    ವಿಡಿಯೋ ತೆಗೆದುಹಾಕಿ
                  </button>
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                aria-label="ವಿಡಿಯೋ ಫೈಲ್"
                accept={VIDEO_TYPES.join(",")}
                onChange={pickVideo}
              />
              <p style={hintStyle}>
                MP4 / WebM / MOV, ಗರಿಷ್ಠ 50MB{existingVideo ? " — ಹೊಸ ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿದರೆ ಹಳೆಯ ವಿಡಿಯೋ ಬದಲಾಗುತ್ತದೆ" : ""}
              </p>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="submit"
            disabled={loading}
            style={{ background: "#2e7d32", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "ಸೇವ್ ಆಗುತ್ತಿದೆ..." : editingId ? "Update Product" : "ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} disabled={loading} style={{ ...smallButton, padding: "10px 16px", background: "white", color: "#555", border: "1px solid #bbb" }}>
              ರದ್ದುಮಾಡಿ
            </button>
          )}
        </div>
        {status && <p style={{ margin: "10px 0 0 0", color: "#2e7d32", fontSize: "14px" }}>{status}</p>}
      </form>
      )}

      {tab === "categories" && (
        <div className="space-y-6">
          <SubcategoriesManager
            products={products}
            onAddProduct={(slug, subId) => {
              resetForm();
              const c = CATEGORIES.find((x) => x.slug === slug);
              if (c) {
                setCategory(c.kn);
                setCategoryEn(c.en);
              }
              if (subId) setSubcategoryId(String(subId));
              setTab("add");
            }}
            onEditProduct={startEdit}
            onOpenBrands={() => setTab("brands")}
          />
          <CategoryLogosManager />
        </div>
      )}

      {tab === "brands" && (
        <BrandsManager
          productCounts={brandCounts}
          products={products}
          onAddProduct={(id) => {
            resetForm();
            setBrandId(String(id));
            setTab("add");
          }}
          onEditProduct={startEdit}
          onProductsChanged={refreshProducts}
        />
      )}

      {tab === "products" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">ಪ್ರಾಡಕ್ಟ್ ಹುಡುಕಿ</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="ಪ್ರಾಡಕ್ಟ್ ಹುಡುಕಿ (ಹೆಸರು / ವರ್ಗ)..."
                className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setTab("add");
              }}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              <PlusCircle className="w-4 h-4" /> ಹೊಸ ಪ್ರಾಡಕ್ಟ್
            </button>
          </div>

          {listed.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 border border-dashed rounded-xl">
              {products.length === 0 ? "ಯಾವುದೇ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ಇಲ್ಲ." : "ಹುಡುಕಿದ ಪ್ರಾಡಕ್ಟ್ ಸಿಗಲಿಲ್ಲ."}
            </p>
          ) : (
            <ul className="space-y-2">
              {listed.map((p) => {
                const photos = getProductImages(p);
                const off = discountPercent(p.price, p.mrp);
                const stock = isInStock(p);
                const cat = categoryOf(p);
                return (
                  <li
                    key={p.id}
                    className={`border rounded-xl p-3 bg-white flex flex-col sm:flex-row gap-3 sm:items-center ${
                      editingId === p.id ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"
                    }`}
                  >
                    <div className="flex gap-3 items-center min-w-0 flex-1">
                      {photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photos[0]} alt={p.name} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-none" />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-lg flex-none" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          {p.name}
                          {p.name_en && p.name_en !== p.name ? <span className="text-slate-500 font-normal"> / {p.name_en}</span> : null}
                        </p>
                        <p className="text-xs mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <b>₹{p.price}</b>
                          {off > 0 && (
                            <>
                              <s className="text-slate-400">₹{p.mrp}</s>
                              <span className="text-red-600 font-bold">{off}% OFF</span>
                            </>
                          )}
                          <span className={stock ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>{stock ? "In Stock" : "Out of Stock"}</span>
                          <span className={cat ? "text-slate-500" : "text-amber-700"}>{cat ? `${cat.kn} / ${cat.en}` : "ವರ್ಗ ಇಲ್ಲ"}</span>
                          {(subcategories ?? []).find((s) => s.id === p.subcategory_id) && (
                            <span className="text-emerald-700 font-semibold">› {(subcategories ?? []).find((s) => s.id === p.subcategory_id).name}</span>
                          )}
                          {brandName(p.brand_id) && <span className="text-slate-700 font-semibold">· {brandName(p.brand_id)}</span>}
                        </p>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          📷 {photos.length} ಫೋಟೋ{p.video_url ? " · ▶ ವಿಡಿಯೋ" : ""} · {p.name_en ? "ಕ + EN" : "ಕ ಮಾತ್ರ"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-none">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-lg px-3 py-2 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        <Pencil className="w-3.5 h-3.5" /> ಎಡಿಟ್
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStock(p)}
                        disabled={stockBusyId === p.id || loading}
                        title={stock ? "Out of Stock ಮಾಡಿ" : "In Stock ಮಾಡಿ"}
                        className={`text-xs font-semibold rounded-lg px-3 py-2 border disabled:opacity-50 ${
                          stock ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-red-400 bg-red-50 text-red-700"
                        }`}
                      >
                        {stockBusyId === p.id ? "..." : stock ? "✅ ಸ್ಟಾಕ್ ಇದೆ" : "⛔ ಸ್ಟಾಕ್ ಇಲ್ಲ"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id || loading}
                        className="flex items-center justify-center gap-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {deletingId === p.id ? "..." : "ಅಳಿಸಿ"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
        </div>
      </section>
    </div>
  );
}
