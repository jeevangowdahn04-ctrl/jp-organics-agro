"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, ShoppingCart, Phone, MapPin, 
  Leaf, ShieldCheck, Sprout, Wrench, 
  Star, Truck, Award, CheckCircle, MessageCircle, X, Loader2
} from "lucide-react";

interface Product {
  id: number | string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  mrp?: number;
  weight?: string;
  rating?: number;
  tag?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Supabase ನಿಂದ ಪ್ರಾಡಕ್ಟ್‌ಗಳನ್ನು ತರುವುದು
  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("id", { ascending: false });

        if (error) {
          console.error("Error fetching products:", error);
        } else if (data) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const categories = [
    { name: "ಸಾವಯವ ಗೊಬ್ಬರಗಳು", icon: Leaf, count: "15+ ಉತ್ಪನ್ನಗಳು" },
    { name: "ಬೆಳೆ ಪೋಷಕಾಂಶಗಳು", icon: Sprout, count: "25+ ಉತ್ಪನ್ನಗಳು" },
    { name: "ಬೆಳೆ ಸಂರಕ್ಷಣೆ", icon: ShieldCheck, count: "30+ ಉತ್ಪನ್ನಗಳು" },
    { name: "ಕೃಷಿ ಪರಿಕರಗಳು", icon: Wrench, count: "10+ ಉತ್ಪನ್ನಗಳು" },
  ];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: number | string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const orderOnWhatsApp = () => {
    if (cart.length === 0) return;
    let message = "ನಮಸ್ಕಾರ JP Organics, ನಾನು ಈ ಕೆಳಗಿನ ಉತ್ಪನ್ನಗಳನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ:\n\n";
    cart.forEach((item, index) => {
      const weightInfo = item.product.weight ? ` (${item.product.weight})` : "";
      message += `${index + 1}. ${item.product.name}${weightInfo} - ${item.quantity} Nos - ₹${Number(item.product.price) * item.quantity}\n`;
    });
    message += `\nಒಟ್ಟು ಮೊತ್ತ: ₹${totalAmount}\n`;
    message += `ದಯವಿಟ್ಟು ಡೆಲಿವರಿ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಿ.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/916360628048?text=${encoded}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      {/* Top Banner */}
      <div className="bg-emerald-900 text-white text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>ಚನ್ನರಾಯಪಟ್ಟಣ, ಹಾಸನ ಜಿಲ್ಲೆ | ಕರ್ನಾಟಕದಾದ್ಯಂತ ಡೆಲಿವರಿ ಲಭ್ಯ</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>ಕೃಷಿ ಸಲಹೆಗೆ ಕರೆ ಮಾಡಿ: 7795198610</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow">
              JP
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-emerald-800">
                JP ORGANICS
              </h1>
              <p className="text-[10px] tracking-wider text-slate-500 font-semibold uppercase">
                And Agro Center
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:flex items-center relative">
            <input
              type="text"
              placeholder="ಗೊಬ್ಬರಗಳು, ಪೋಷಕಾಂಶಗಳನ್ನು ಹುಡುಕಿ..."
              className="w-full pl-10 pr-4 py-2 border rounded-full text-sm bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="tel:7795198610"
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">ಕೃಷಿ ಸಹಾಯವಾಣಿ</span>
            </a>
            <div 
              onClick={() => setIsCartOpen(true)}
              className="relative cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-50 transition">
                <ShoppingCart className="w-5 h-5 text-slate-700" />
              </div>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {totalItems}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="inline-block bg-emerald-700/80 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium border border-emerald-600">
              ರೈತರಿಗಾಗಿ ಅಧಿಕೃತ ಗುಣಮಟ್ಟದ ಕೃಷಿ ಉತ್ಪನ್ನಗಳು
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              ನಿಮ್ಮ ತೋಟದ ಸಮೃದ್ಧ ಇಳುವರಿಗೆ <br />
              <span className="text-amber-400">ಸಾವಯವ ಪೋಷಕಾಂಶಗಳು</span>
            </h2>
            <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
              ತೆಂಗು, ಅಡಿಕೆ ಮತ್ತು ವಾಣಿಜ್ಯ ಬೆಳೆಗಳಿಗೆ ಬೇಕಾಗುವ ಹ್ಯೂಮಿಕ್ ಆಸಿಡ್ ಮತ್ತು ನಿಖರ ಕೃಷಿ ಸೂತ್ರಗಳು ಲಭ್ಯ.
            </p>
            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <a 
                href="https://wa.me/916360628048?text=ನಮಸ್ಕಾರ,%20ನನಗೆ%20ಕೃಷಿ%20ಉತ್ಪನ್ನಗಳ%20ಬಗ್ಗೆ%20ಮಾಹಿತಿ%20ಬೇಕು" 
                target="_blank"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow flex items-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp ನಲ್ಲಿ ವಿಚಾರಿಸಿ
              </a>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-full md:w-80 space-y-4">
            <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
              <Award className="w-5 h-5" /> JP ಆಗ್ರೋ ಭರವಸೆಗಳು
            </h3>
            <div className="space-y-3 text-xs text-slate-100">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>100% ಪರಿಶುದ್ಧ ಹಾಗೂ ಪರೀಕ್ಷಿತ ಸಾವಯವ ಸೂತ್ರಗಳು</span>
              </div>
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>ರೈತರ ಮನೆಬಾಗಿಲಿಗೆ ತ್ವರಿತ ಡೆಲಿವರಿ ಸೌಲಭ್ಯ</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>ಅಡಿಕೆ ಮತ್ತು ತೆಂಗಿನ ಬೇರು ಪೋಷಣೆಗೆ ಮಾರ್ಗದರ್ಶನ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h3 className="text-xl font-bold text-slate-800 mb-6">ಮುಖ್ಯ ವಿಭಾಗಗಳು (Categories)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const IconComponent = cat.icon;
            return (
              <div 
                key={idx} 
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <IconComponent className="w-6 h-6 text-emerald-700" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1">{cat.name}</h4>
                <p className="text-xs text-slate-400">{cat.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dynamic Products from Supabase */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6">ಜನಪ್ರಿಯ ಉತ್ಪನ್ನಗಳು (Featured Products)</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12 text-emerald-700 font-semibold gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> ಉತ್ಪನ್ನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
            ಯಾವುದೇ ಉತ್ಪನ್ನಗಳು ಲಭ್ಯವಿಲ್ಲ. ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್ ಮೂಲಕ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col justify-between"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      {item.tag || "Organic"}
                    </span>
                    <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                      {item.rating || 4.8}
                    </div>
                  </div>

                  <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <Sprout className="w-12 h-12 text-emerald-500" />
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-600 uppercase">
                    {item.category || "ಕೃಷಿ ಪೋಷಕಾಂಶ"}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">
                    {item.name}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  {item.weight && (
                    <p className="text-xs text-slate-400 mt-1 font-medium">ಪ್ಯಾಕಿಂಗ್: {item.weight}</p>
                  )}
                </div>

                <div className="p-4 pt-0 border-t border-slate-100">
                  <div className="flex items-baseline gap-2 mt-3 mb-3">
                    <span className="text-lg font-extrabold text-slate-900">₹{item.price}</span>
                    {item.mrp && (
                      <span className="text-xs text-slate-400 line-through">₹{item.mrp}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 shadow-2xl">
            <div>
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" /> ನಿಮ್ಮ ಕಾರ್ಟ್ ({totalItems})
                </h3>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  ಕಾರ್ಟ್ ಖಾಲಿಯಾಗಿದೆ. ಉತ್ಪನ್ನಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{item.product.name}</h4>
                        <p className="text-xs text-slate-500">₹{item.product.price} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-emerald-700">₹{Number(item.product.price) * item.quantity}</span>
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold"
                        >
                          ತೆಗೆದುಹಾಕಿ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between text-base font-bold mb-4">
                  <span>ಒಟ್ಟು ಮೊತ್ತ:</span>
                  <span className="text-emerald-700">₹{totalAmount}</span>
                </div>
                <button
                  onClick={orderOnWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" /> WhatsApp ನಲ್ಲಿ ಆರ್ಡರ್ ಪೂರ್ಣಗೊಳಿಸಿ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-16 py-8 border-t border-slate-800 text-center text-xs">
        <p className="font-bold text-sm text-white mb-2">JP ORGANICS AND AGRO CENTER</p>
        <p className="text-slate-400 mb-2">ಚನ್ನರಾಯಪಟ್ಟಣ, ಹಾಸನ ಜಿಲ್ಲೆ | ಸಹಾಯವಾಣಿ: 7795198610</p>
        <p className="text-slate-500">© 2026 JP Organics and Agro Center. All Rights Reserved.</p>
      </footer>
    </div>
  );
}