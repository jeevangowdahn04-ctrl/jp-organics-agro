"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { addProduct, logout } from "./actions";

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Supabase ನಿಂದ ಪ್ರಾಡಕ್ಟ್‌ಗಳ ಪಟ್ಟಿ ಪಡೆಯುವುದು
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });
    if (!error && data) setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await addProduct({ name, price, description });

    if (error) {
      alert("Error: " + error);
    } else {
      alert("ಪ್ರಾಡಕ್ಟ್ ಯಶಸ್ವಿಯಾಗಿ ಸೇವ್ ಆಗಿದೆ!");
      setName("");
      setPrice("");
      setDescription("");
      fetchProducts();
    }
    setLoading(false);
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
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>ಪ್ರಾಡಕ್ಟ್ ಹೆಸರು:</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            placeholder="ಉದಾ: Humic Acid 98%"
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} 
          />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>ಬೆಲೆ (₹):</label>
          <input 
            type="number" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
            required 
            placeholder="ಉದಾ: 450"
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} 
          />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>ವಿವರಣೆ (Description):</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            rows="3" 
            placeholder="ಪ್ರಾಡಕ್ಟ್ ವಿವರಣೆ..."
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading} 
          style={{ background: "#2e7d32", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          {loading ? "ಸೇವ್ ಆಗುತ್ತಿದೆ..." : "ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ"}
        </button>
      </form>

      <h3 style={{ marginTop: "30px" }}>ಹಾಲಿ ಇರುವ ಪ್ರಾಡಕ್ಟ್‌ಗಳು</h3>
      <div style={{ marginTop: "10px" }}>
        {products.length === 0 ? (
          <p style={{ color: "#777" }}>ಯಾವುದೇ ಪ್ರಾಡಕ್ಟ್‌ಗಳು ಇಲ್ಲ.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "6px", marginBottom: "10px", background: "#fff" }}>
              <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>{p.name} - ₹{p.price}</h4>
              <p style={{ margin: 0, color: "#666" }}>{p.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}