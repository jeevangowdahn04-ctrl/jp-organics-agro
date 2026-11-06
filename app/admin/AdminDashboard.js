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
import { addProduct, createUploadUrl, deleteProduct, discardUploads, logout, updateProduct } from "./actions";

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
/** @param {{ embedded?: boolean, initialEditId?: string | number | null, onProductsChanged?: () => void }} [props] */
export default function AdminDashboard({ embedded = false, initialEditId = null, onProductsChanged } = {}) {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [category, setCategory] = useState("");
  const [weight, setWeight] = useState("");
  const [inStock, setInStock] = useState(true);
  const [highlights, setHighlights] = useState("");
  const [description, setDescription] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryEn, setCategoryEn] = useState("");
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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
        name, nameEn, price, mrp, category, categoryEn, weight, inStock,
        highlights, highlightsEn, description, descriptionEn, imageUrls, videoUrl,
      };
      const { error } = editingId ? await updateProduct(editingId, payload) : await addProduct(payload);
      if (error) throw new Error(error);

      alert(editingId ? "ಪ್ರಾಡಕ್ಟ್ ಅಪ್‌ಡೇಟ್ ಆಗಿದೆ!" : "ಪ್ರಾಡಕ್ಟ್ ಯಶಸ್ವಿಯಾಗಿ ಸೇವ್ ಆಗಿದೆ!");
      resetForm();
      refreshProducts();
    } catch (err) {
      // ಸೇವ್ ವಿಫಲವಾದರೆ ಈಗಷ್ಟೇ ಅಪ್‌ಲೋಡ್ ಆದ ಫೈಲ್‌ಗಳನ್ನು Storage ನಲ್ಲಿ ಉಳಿಸಬಾರದು
      if (uploaded.length) await discardUploads(uploaded);
      alert("Error: " + err.message);
    } finally {
      setStatus("");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: embedded ? "0 auto" : "40px auto", padding: embedded ? "12px 16px 24px" : "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: embedded ? "none" : "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2e7d32", paddingBottom: "10px" }}>
        <h1 style={{ margin: 0, color: "#2e7d32" }}>
          JP Organics - Admin Dashboard
        </h1>
        <form action={logout}>
          <button
            type="submit"
            style={{ background: "white", color: "#2e7d32", padding: "6px 14px", border: "1px solid #2e7d32", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            ಲಾಗ್‌ಔಟ್
          </button>
        </form>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{ background: editingId ? "#fff8e1" : "#f9f9f9", border: editingId ? "1px solid #ffe082" : "none", padding: "20px", borderRadius: "8px", marginTop: "20px", scrollMarginTop: "20px" }}>
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

      {/* ವರ್ಗಗಳ ಲೋಗೋ (ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಅಥವಾ ಇಮೇಜ್ ಲಿಂಕ್) */}
      <CategoryLogosManager />

      <h3 style={{ marginTop: "30px" }}>ಹಾಲಿ ಇರುವ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ({products.length})</h3>
      <div style={{ marginTop: "10px" }}>
        {products.length === 0 ? (
          <p style={{ color: "#777" }}>ಯಾವುದೇ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ಇಲ್ಲ.</p>
        ) : (
          products.map((p) => {
            const photos = getProductImages(p);
            return (
              <div
                key={p.id}
                style={{ display: "flex", gap: "12px", alignItems: "center", border: editingId === p.id ? "2px solid #ffb300" : "1px solid #ddd", padding: "12px", borderRadius: "6px", marginBottom: "10px", background: "#fff" }}>
                {photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[0]} alt={p.name} style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "64px", height: "64px", background: "#f0f0f0", borderRadius: "4px", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 3px 0", color: "#333" }}>
                    {p.name}
                    {p.name_en && p.name_en !== p.name ? <span style={{ color: "#777", fontWeight: "normal" }}> / {p.name_en}</span> : null}
                    <span style={{ fontSize: "11px", fontWeight: "normal", color: p.name_en ? "#2e7d32" : "#999", marginLeft: "6px" }}>
                      {p.name_en ? "ಕ + EN" : "ಕ ಮಾತ್ರ"}
                    </span>
                  </h4>
                  <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                    <b>₹{p.price}</b>
                    {discountPercent(p.price, p.mrp) > 0 && (
                      <>
                        {" "}<s style={{ color: "#888" }}>₹{p.mrp}</s>{" "}
                        <span style={{ color: "#c62828", fontWeight: "bold" }}>{discountPercent(p.price, p.mrp)}% OFF</span>
                      </>
                    )}
                    {" · "}
                    <span style={{ color: isInStock(p) ? "#2e7d32" : "#c62828", fontWeight: "bold" }}>
                      {isInStock(p) ? "In Stock" : "Out of Stock"}
                    </span>
                    {p.category ? <span style={{ color: "#777" }}> · {p.category}</span> : null}
                  </p>
                  <p style={{ margin: 0, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#2e7d32" }}>
                    📷 {photos.length} ಫೋಟೋ{p.video_url ? " · ▶ ವಿಡಿಯೋ ಇದೆ" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    disabled={loading}
                    style={{ ...smallButton, background: "white", color: "#2e7d32", border: "1px solid #2e7d32" }}>
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    disabled={deletingId === p.id || loading}
                    style={{ ...smallButton, background: "#c62828", color: "white", border: "none" }}>
                    {deletingId === p.id ? "ಅಳಿಸುತ್ತಿದೆ..." : "🗑️ Delete"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
