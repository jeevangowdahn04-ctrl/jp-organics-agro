"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES, MEDIA_BUCKET, VIDEO_TYPES, getYouTubeId } from "@/lib/media";
import { addProduct, createUploadUrl, logout } from "./actions";

const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "bold" };
const hintStyle = { margin: "4px 0 0 0", fontSize: "12px", color: "#777" };

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

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [videoMode, setVideoMode] = useState("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const refreshProducts = async () => {
    const data = await loadProducts();
    if (data) setProducts(data);
  };

  // Supabase ನಿಂದ ಪ್ರಾಡಕ್ಟ್‌ಗಳ ಪಟ್ಟಿ ಪಡೆಯುವುದು
  useEffect(() => {
    let active = true;
    loadProducts().then((data) => {
      if (active && data) setProducts(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);

  const pickFile = (e, allowed, setter) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !allowed.includes(file.type)) {
      alert("ಈ ಫೈಲ್ ಪ್ರಕಾರ ಬೆಂಬಲಿತವಲ್ಲ.");
      e.target.value = "";
      return setter(null);
    }
    if (file && file.size > MAX_UPLOAD_BYTES) {
      alert("ಫೈಲ್ ಗಾತ್ರ 50MB ಗಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.");
      e.target.value = "";
      return setter(null);
    }
    setter(file);
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setDescription("");
    setImageFile(null);
    setYoutubeUrl("");
    setVideoFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (videoMode === "youtube" && youtubeUrl.trim() && !getYouTubeId(youtubeUrl)) {
      alert("ಸರಿಯಾದ YouTube ಲಿಂಕ್ ಹಾಕಿ.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        setStatus("ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...");
        imageUrl = await uploadFile(imageFile);
      }

      let videoUrl = "";
      if (videoMode === "youtube") {
        videoUrl = youtubeUrl.trim();
      } else if (videoFile) {
        setStatus("ವಿಡಿಯೋ ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ... (ದೊಡ್ಡ ಫೈಲ್‌ಗೆ ಸ್ವಲ್ಪ ಸಮಯ ಬೇಕು)");
        videoUrl = await uploadFile(videoFile);
      }

      setStatus("ಪ್ರಾಡಕ್ಟ್ ಸೇವ್ ಆಗುತ್ತಿದೆ...");
      const { error } = await addProduct({ name, price, description, imageUrl, videoUrl });
      if (error) throw new Error(error);

      alert("ಪ್ರಾಡಕ್ಟ್ ಯಶಸ್ವಿಯಾಗಿ ಸೇವ್ ಆಗಿದೆ!");
      resetForm();
      refreshProducts();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setStatus("");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2e7d32", paddingBottom: "10px" }}>
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

      <form onSubmit={handleAddProduct} style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
        <h3>ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ (Add Product)</h3>
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>ಪ್ರಾಡಕ್ಟ್ ಹೆಸರು:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ಉದಾ: Humic Acid 98%"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>ಬೆಲೆ (₹):</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="ಉದಾ: 450"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>ವಿವರಣೆ (Description):</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            placeholder="ಪ್ರಾಡಕ್ಟ್ ವಿವರಣೆ..."
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label htmlFor="productImage" style={labelStyle}>ಪ್ರಾಡಕ್ಟ್ ಫೋಟೋ (Image):</label>
          <input
            id="productImage"
            ref={imageInputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={(e) => pickFile(e, IMAGE_TYPES, setImageFile)}
          />
          <p style={hintStyle}>JPG / PNG / WebP / GIF, ಗರಿಷ್ಠ 50MB</p>
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="ಫೋಟೋ ಮುನ್ನೋಟ" style={{ marginTop: "8px", maxHeight: "140px", borderRadius: "6px", border: "1px solid #ddd" }} />
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
              placeholder="https://www.youtube.com/watch?v=..."
              style={inputStyle}
            />
          ) : (
            <>
              <input
                ref={videoInputRef}
                type="file"
                aria-label="ವಿಡಿಯೋ ಫೈಲ್"
                accept={VIDEO_TYPES.join(",")}
                onChange={(e) => pickFile(e, VIDEO_TYPES, setVideoFile)}
              />
              <p style={hintStyle}>MP4 / WebM / MOV, ಗರಿಷ್ಠ 50MB</p>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ background: "#2e7d32", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          {loading ? "ಸೇವ್ ಆಗುತ್ತಿದೆ..." : "ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ"}
        </button>
        {status && <p style={{ margin: "10px 0 0 0", color: "#2e7d32", fontSize: "14px" }}>{status}</p>}
      </form>

      <h3 style={{ marginTop: "30px" }}>ಹಾಲಿ ಇರುವ ಪ್ರಾಡಕ್ಟ್‌ಗಳು</h3>
      <div style={{ marginTop: "10px" }}>
        {products.length === 0 ? (
          <p style={{ color: "#777" }}>ಯಾವುದೇ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ಇಲ್ಲ.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: "12px", alignItems: "center", border: "1px solid #ddd", padding: "12px", borderRadius: "6px", marginBottom: "10px", background: "#fff" }}>
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
              ) : (
                <div style={{ width: "64px", height: "64px", background: "#f0f0f0", borderRadius: "4px", flexShrink: 0 }} />
              )}
              <div>
                <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>{p.name} - ₹{p.price}</h4>
                <p style={{ margin: 0, color: "#666" }}>{p.description}</p>
                {p.video_url && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#2e7d32" }}>▶ ವಿಡಿಯೋ ಇದೆ</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
