"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingBag, Heart, Search, X, Plus, Minus, ChevronRight,
  Star, Menu, MapPin, Phone, Mail, Send,
  ChevronLeft, Eye, Truck, Shield, RotateCcw, Sparkles,
  MessageCircle, ArrowRight, Check, Camera, User, LogOut, Package
} from "lucide-react";
import { getProducts, getCategories, addOrder, getOrdersByPhone, addSubscriber, Product, Category } from "@/lib/firebase/services";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "./AuthModal";

// Custom Instagram icon since lucide-react doesn't have it in this version
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}



interface Testimonial {
  id: number;
  name: string;
  text: string;
  rating: number | null;
  imageUrl: string | null;
}

interface CartItem extends Product {
  selectedSize: string | null;
  quantity: number;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

export default function StoreApp({
  initialProducts,
  initialCategories,
  initialTestimonials,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
  initialTestimonials: Testimonial[];
}) {
  // State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [testimonials] = useState<Testimonial[]>(initialTestimonials);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wishlist, setWishlist] = useState<(string | number)[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string | number, string>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [orderId, setOrderId] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [trackPhone, setTrackPhone] = useState("");
  const [trackedOrders, setTrackedOrders] = useState<unknown[]>([]);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "featured" | "bestseller" | "new">("all");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { user } = useAuth();

  const toastIdRef = useRef(0);
  const pendingProductRef = useRef<Product | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);

  // Fetch products and categories
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [p, c] = await Promise.all([getProducts(), getCategories()]);
        setProducts(p);
        setCategories(c);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Load cart & wishlist from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("riii_cart");
      if (savedCart) setCart(JSON.parse(savedCart));
      const savedWishlist = localStorage.getItem("riii_wishlist");
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch { }
    setIsCartLoaded(true); // mark loaded AFTER reading
  }, []);

  // Save cart to localStorage — only after it has been loaded (prevents overwriting on mount)
  useEffect(() => {
    if (!isCartLoaded) return;
    localStorage.setItem("riii_cart", JSON.stringify(cart));
  }, [cart, isCartLoaded]);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem("riii_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [products, activeCategory, filterTab]);

  // Testimonial auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Toast notifications
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  // Cart functions
  const addToCart = useCallback((product: Product) => {
    if (!user) {
      pendingProductRef.current = product; // remember which product they wanted
      setIsAuthModalOpen(true);
      return;
    }
    const size = selectedSizes[product.id];
    if (product.sizes && product.sizes.length > 0 && !size) {
      showToast(`Please select a size for ${product.name}`, "error");
      return;
    }
    setCart((prev) => {
      const existing = prev.findIndex((item) => item.id === product.id && item.selectedSize === size);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [...prev, { ...product, selectedSize: size || null, quantity: 1 }];
    });
    showToast(`${product.name} added to cart ✨`);
  }, [selectedSizes, showToast, user, setIsAuthModalOpen]);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCartQuantity = useCallback((index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(1, updated[index].quantity + delta) };
      return updated;
    });
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Wishlist functions
  const toggleWishlist = useCallback((productId: string | number) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        showToast("Removed from wishlist", "info");
        return prev.filter((id) => id !== productId);
      }
      showToast("Added to wishlist 💛");
      return [...prev, productId];
    });
  }, [showToast]);

  // Size selection
  const selectSize = useCallback((productId: string | number, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "All" || categories.find((c) => c.name === activeCategory)?.id === p.categoryId;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterTab === "all" || (filterTab === "featured" && p.featured) || (filterTab === "bestseller" && p.bestSeller) || (filterTab === "new" && p.newArrival);
    return matchesCategory && matchesSearch && matchesFilter;
  });

  // Newsletter
  const handleNewsletter = async () => {
    if (!newsletterEmail) return;
    try {
      await addSubscriber(newsletterEmail);
      setNewsletterSubmitted(true);
      showToast("Welcome to the Riii Jewels family! 💛");
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    }
  };

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const name = (document.getElementById("c-name") as HTMLInputElement)?.value;
    const phone = (document.getElementById("c-phone") as HTMLInputElement)?.value;
    const address = (document.getElementById("c-address") as HTMLTextAreaElement)?.value;
    if (!name || !phone || !address) {
      showToast("Please fill in all details", "error");
      return;
    }
    try {
      const orderId = await addOrder({ customerName: name, phone, address, items: cart, totalAmount: cartTotal });
      setOrderId(orderId);
      setCheckoutStep(3);
      setCart([]);
      showToast("Order placed successfully! 🎉");
    } catch {
      showToast("Failed to place order. Please try again.", "error");
    }
  };

  // Track orders
  const handleTrackOrders = async () => {
    if (!trackPhone) return;
    try {
      const data = await getOrdersByPhone(trackPhone);
      setTrackedOrders(data);
    } catch {
      showToast("Failed to fetch orders", "error");
    }
  };

  // Scroll to section
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          pendingProductRef.current = null;
        }}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          const pending = pendingProductRef.current;
          if (pending) {
            const size = selectedSizes[pending.id];
            setCart(prev => {
              const existing = prev.findIndex(i => i.id === pending.id && i.selectedSize === size);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
                return updated;
              }
              return [...prev, { ...pending, selectedSize: size || null, quantity: 1 }];
            });
            showToast(`${pending.name} added to cart ✨`);
            pendingProductRef.current = null;
          }
        }}
      />
      {/* Toast Notifications */}
      <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast px-5 py-3 rounded-sm text-sm font-sans shadow-lg ${toast.type === "success" ? "bg-charcoal text-white" : toast.type === "error" ? "bg-red-800 text-white" : "bg-charcoal/90 text-white"}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "bg-cream/95 backdrop-blur-md shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Mobile Menu */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 hover:opacity-70 transition-opacity">
              <Menu className={`w-5 h-5 ${isScrolled ? "text-charcoal" : "text-white"}`} />
            </button>

            {/* Logo */}
            <button onClick={() => scrollTo("hero")} className="flex items-center gap-3 group">
              <div className={`font-serif text-xl sm:text-2xl font-semibold tracking-wide transition-colors duration-500 ${isScrolled ? "text-charcoal" : "text-white"}`}>
                Riii Jewels
              </div>
            </button>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-8">
              {["Home", "Collection", "Story", "Contact"].map((item) => (
                <button key={item} onClick={() => scrollTo(item.toLowerCase() === "home" ? "hero" : item.toLowerCase())} className={`text-xs uppercase tracking-[0.2em] font-medium elegant-underline transition-colors duration-500 ${isScrolled ? "text-charcoal/70 hover:text-charcoal" : "text-white/80 hover:text-white"}`}>
                  {item}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`group flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                title="Search products"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:block text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">Search</span>
              </button>

              {/* Wishlist */}
              <button
                onClick={() => setIsWishlistOpen(true)}
                className={`group flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg relative transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                title={wishlist.length > 0 ? `Wishlist (${wishlist.length} items)` : "Wishlist"}
              >
                <div className="relative">
                  <Heart className={`w-5 h-5 transition-colors ${wishlist.length > 0 ? "fill-gold text-gold" : ""}`} />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                      {wishlist.length}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                  {wishlist.length > 0 ? `Saved` : "Wishlist"}
                </span>
              </button>

              {/* Cart */}
              <Link
                href="/cart"
                className={`group flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg relative transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                title={cart.length > 0 ? `Cart · ${cart.length} item${cart.length > 1 ? "s" : ""} · ₹${cart.reduce((s, i) => s + i.price * i.quantity, 0)}` : "Shopping Cart"}
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                      {cart.length}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                  {cart.length > 0 ? `₹${cart.reduce((s, i) => s + i.price * i.quantity, 0)}` : "Cart"}
                </span>
              </Link>

              {/* Divider */}
              <div className={`hidden lg:block w-px h-6 mx-1 ${isScrolled ? "bg-charcoal/15" : "bg-white/20"}`} />

              {/* User Account */}
              {user ? (
                <div className="hidden lg:flex items-center gap-1">
                  <Link
                    href="/account"
                    className={`group flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                    title="My Account"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">Account</span>
                  </Link>
                  <Link
                    href="/orders"
                    className={`group flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                    title="My Orders"
                  >
                    <Package className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">Orders</span>
                  </Link>
                  <button
                    onClick={() => setShowSignOutConfirm(true)}
                    className={`group flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`hidden lg:flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg group transition-all duration-200 hover:scale-105 ${isScrolled ? "text-charcoal hover:bg-charcoal/5" : "text-white hover:bg-white/10"}`}
                  title="Sign In to your account"
                >
                  <User className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-[0.12em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] modal-overlay animate-fade-in">
          <div className="bg-cream w-80 h-full p-8 animate-slide-in-left">
            <div className="flex justify-between items-center mb-12">
              <span className="font-serif text-2xl text-charcoal">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-charcoal hover:text-gold transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {[
                { label: "Home", target: "hero" },
                { label: "Collection", target: "collection" },
                { label: "Our Story", target: "story" },
                { label: "Contact", target: "contact" },
                { label: "Track Orders", target: "orders" },
              ].map((item) => (
                <button key={item.label} onClick={() => { scrollTo(item.target); setIsMobileMenuOpen(false); if (item.target === "orders") setIsOrdersModalOpen(true); }} className="text-left font-serif text-xl text-charcoal hover:text-gold transition-colors flex items-center gap-2 group">
                  {item.label}
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-charcoal/10 flex flex-col gap-6">
              {user ? (
                <>
                  <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} className="text-left font-serif text-xl text-charcoal hover:text-gold transition-colors flex items-center gap-3 group">
                    <User className="w-5 h-5" /> My Account
                  </Link>
                  <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)} className="text-left font-serif text-xl text-charcoal hover:text-gold transition-colors flex items-center gap-3 group">
                    <Package className="w-5 h-5" /> My Orders
                  </Link>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowSignOutConfirm(true); }} className="text-left font-serif text-xl text-charcoal hover:text-gold transition-colors flex items-center gap-3 group">
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </>
              ) : (
                <button onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true); }} className="text-left font-serif text-xl text-charcoal hover:text-gold transition-colors flex items-center gap-3 group">
                  <User className="w-5 h-5" /> Sign In / Register
                </button>
              )}
            </div>
            <div className="mt-8 pt-8 border-t border-charcoal/10">
              <a href="https://instagram.com/riii_jewels.by_areesha" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-charcoal/60 hover:text-gold transition-colors text-sm">
                <InstagramIcon className="w-4 h-4" /> @riii_jewels.by_areesha
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] modal-overlay animate-fade-in flex items-start justify-center pt-32" onClick={() => setIsSearchOpen(false)}>
          <div className="bg-ivory w-full max-w-2xl mx-4 rounded-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-5 border-b border-charcoal/10">
              <Search className="w-5 h-5 text-gold" />
              <input
                type="text"
                placeholder="Search our collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-charcoal font-serif text-lg outline-none placeholder:text-charcoal/30"
                autoFocus
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {searchQuery && (
              <div className="max-h-96 overflow-y-auto p-4">
                {filteredProducts.length === 0 ? (
                  <p className="text-charcoal/40 text-center py-8 font-serif">No pieces found matching &ldquo;{searchQuery}&rdquo;</p>
                ) : (
                  filteredProducts.slice(0, 6).map((product) => (
                    <button key={product.id} onClick={() => { setQuickViewProduct(product); setIsSearchOpen(false); setSearchQuery(""); }} className="flex items-center gap-4 w-full p-3 hover:bg-cream/50 transition-colors rounded-sm">
                      <Image src={product.imageUrl} alt={product.name} width={56} height={56} className="w-14 h-14 object-cover rounded-sm shrink-0" />
                      <div className="text-left">
                        <p className="font-serif text-charcoal">{product.name}</p>
                        <p className="text-sm text-charcoal/50">₹{product.price}{product.originalPrice && <span className="line-through ml-2">₹{product.originalPrice}</span>}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[110] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSignOutConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm border border-charcoal/10 text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="font-serif text-2xl text-charcoal mb-2">Sign Out?</h2>
            <p className="text-sm text-charcoal/60 mb-6 leading-relaxed">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 border border-charcoal/15 text-charcoal/60 px-4 py-3 text-xs uppercase tracking-wider rounded-sm hover:border-charcoal/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowSignOutConfirm(false);
                  const { signOut } = await import("firebase/auth");
                  const { auth: a } = await import("@/lib/firebase/config");
                  await signOut(a);
                  showToast("Signed out successfully");
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 text-xs uppercase tracking-wider rounded-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      {/* Hero Section */}
      <section id="hero" ref={heroRef} className="relative flex items-center overflow-hidden" style={{ minHeight: '100dvh' }}>
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/4155252/pexels-photo-4155252.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=2000"
            alt="Premium Jewelry"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Aesthetic gradient for left-aligned text: Dark on the left, fading out to the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/95 via-charcoal/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent sm:hidden" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full pt-24 pb-20 sm:pt-0 sm:pb-0">
          <div className="max-w-2xl">
            {/* Tagline */}
            <div className="flex items-center gap-4 mb-6 sm:mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-12 h-[1px] bg-gold" />
              <p className="text-gold text-[10px] sm:text-xs uppercase tracking-[0.4em] font-medium drop-shadow-sm">
                Premium Anti-Tarnish
              </p>
            </div>

            {/* Main Heading */}
            <h1 className="font-serif text-[3.5rem] xs:text-6xl sm:text-7xl lg:text-[5.5rem] text-white font-light leading-[1.1] mb-4 sm:mb-6 animate-fade-in-up tracking-wide drop-shadow-lg" style={{ animationDelay: "0.4s" }}>
              Riii Jewels
              <span className="block italic text-white/90 text-3xl sm:text-5xl lg:text-6xl mt-2 sm:mt-4 font-light drop-shadow-md">
                by Areesha
              </span>
            </h1>

            <p className="text-white/80 text-sm sm:text-base lg:text-lg font-light tracking-wide leading-relaxed mb-10 sm:mb-12 max-w-md animate-fade-in-up drop-shadow-md" style={{ animationDelay: "0.6s" }}>
              Hand-picked, premium anti-tarnish jewelry. True elegance should be accessible every day.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
              <button onClick={() => scrollTo("collection")} className="w-full sm:w-auto justify-center bg-gold hover:bg-gold-dark text-white px-10 py-4 text-[10px] sm:text-xs uppercase tracking-[0.25em] font-medium transition-all duration-500 shadow-lg">
                Explore Collection
              </button>
              <button onClick={() => scrollTo("story")} className="w-full sm:w-auto justify-center flex items-center gap-3 border border-white/30 hover:border-white text-white px-10 py-4 text-[10px] sm:text-xs uppercase tracking-[0.25em] font-medium transition-all duration-500 hover:bg-white/5 group">
                Our Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-6 sm:left-8 flex flex-col items-center gap-4 animate-fade-in-up" style={{ animationDelay: "1s" }}>
          <div className="w-px h-12 sm:h-16 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
          <span className="text-white/40 text-[9px] uppercase tracking-[0.4em]" style={{ writingMode: 'vertical-rl' }}>Scroll</span>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 sm:py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="text-gold text-xs uppercase tracking-[0.3em] mb-3">Explore</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-charcoal">Shop by Category</h2>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-6 sm:gap-10 pb-12 pt-4 px-4 sm:px-8 reveal" style={{ WebkitOverflowScrolling: 'touch' }}>
            {isLoading ? (
              [...Array(4)].map((_, idx) => (
                <div key={`cat-skel-${idx}`} className="shrink-0 snap-center w-64 sm:w-80 aspect-[4/5] rounded-[2rem] overflow-hidden border border-charcoal/5">
                  <div className="w-full h-full skeleton" />
                </div>
              ))
            ) : (
              categories.map((category, idx) => (
                <button
                  key={category.id}
                  onClick={() => { setActiveCategory(category.name); scrollTo("collection"); }}
                  className="relative shrink-0 snap-center w-64 sm:w-80 aspect-[4/5] rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-700 ease-out border border-charcoal/5"
                  style={{ transitionDelay: `${idx * 0.1}s` }}
                >
                  {/* Background Image */}
                  <Image
                    src={category.imageUrl || "https://images.pexels.com/photos/4155252/pexels-photo-4155252.jpeg"}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 256px, 320px"
                    className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 transform-gpu"
                  />

                  {/* Elegant Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

                  {/* Content Panel */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-8 text-center z-10">
                    <p className="text-gold text-[10px] uppercase tracking-[0.4em] font-medium mb-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 ease-out transform-gpu">
                      Discover Collection
                    </p>

                    <h3 className="text-white font-serif text-3xl sm:text-4xl tracking-wider translate-y-4 group-hover:translate-y-0 transition-transform duration-700 ease-out transform-gpu">
                      {category.name}
                    </h3>

                    <div className="w-0 h-px bg-gold mt-6 group-hover:w-16 transition-all duration-700 ease-out delay-100" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Exclusive Sale Section */}
      {(isLoading || products.some((p) => p.onSale)) && (
        <section className="py-16 sm:py-24 bg-cream-dark border-y border-gold/8 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 reveal">
              <div>
                <p className="text-rose text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Limited Time
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl text-charcoal">Exclusive Sale</h2>
              </div>
              {/* <p className="text-charcoal/50 text-sm mt-4 md:mt-0 max-w-md md:text-right">
                Discover premium anti-tarnish jewelry at special prices. Add these dazzling pieces to your collection today.
              </p> */}
            </div>

            <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 sm:gap-6 snap-x snap-mandatory reveal hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              {isLoading ? (
                [...Array(4)].map((_, idx) => (
                  <div key={`sale-skel-${idx}`} className="snap-start shrink-0 w-[240px] sm:w-[300px] flex flex-col bg-ivory rounded-sm border border-gold/10 shadow-sm overflow-hidden">
                    <div className="aspect-[4/5] skeleton" />
                    <div className="p-4 flex flex-col gap-3">
                      <div className="h-4 skeleton w-3/4" />
                      <div className="h-5 skeleton w-1/3" />
                      <div className="h-10 skeleton w-full mt-2" />
                    </div>
                  </div>
                ))
              ) : (
                products.filter(p => p.onSale).map((product, idx) => (
                  <div key={product.id} className="snap-start shrink-0 w-[240px] sm:w-[300px] product-card-hover group h-full flex flex-col bg-ivory rounded-sm border border-gold/10 shadow-sm" style={{ transitionDelay: `${idx * 0.1}s` }}>
                    <div className="relative overflow-hidden rounded-t-sm aspect-[4/5] bg-cream-dark">
                      <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 240px, 300px" className="product-image object-cover transition-transform duration-700" />
                      <div className="absolute top-3 left-3 bg-rose text-white text-[10px] px-3 py-1 uppercase tracking-wider font-bold shadow-md">
                        SALE
                      </div>
                      {/* Hover Overlay */}
                      <div className="product-overlay absolute inset-0 bg-charcoal/10 opacity-0 transition-opacity duration-300 flex items-end justify-center pb-4 gap-2">
                        <button onClick={() => setQuickViewProduct(product)} className="bg-cream text-charcoal p-2.5 rounded-sm hover:bg-gold hover:text-white transition-colors shadow-md">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => addToCart(product)} className="bg-charcoal text-white p-2.5 rounded-sm hover:bg-gold transition-colors shadow-md">
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-serif text-base text-charcoal group-hover:text-gold transition-colors duration-300 mb-1 line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-rose font-bold text-lg">₹{product.price}</span>
                        {product.originalPrice && <span className="text-charcoal/30 text-sm line-through">₹{product.originalPrice}</span>}
                      </div>
                      <button onClick={() => addToCart(product)} className="w-full mt-auto py-3 bg-charcoal text-white text-[11px] uppercase tracking-[0.15em] font-medium rounded-sm hover:bg-gold transition-all duration-300">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Collection Section */}
      <section id="collection" ref={collectionRef} className="py-16 sm:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 reveal">
            <p className="text-gold text-xs uppercase tracking-[0.3em] mb-3">Curated For You</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-charcoal">Our Collection</h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 reveal">
            <button onClick={() => setActiveCategory("All")} className={`px-5 py-2 text-xs uppercase tracking-[0.15em] font-medium transition-all duration-300 rounded-sm ${activeCategory === "All" ? "bg-charcoal text-white" : "bg-ivory text-charcoal/60 hover:text-charcoal border border-gold/15"}`}>
              All
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.name)} className={`px-5 py-2 text-xs uppercase tracking-[0.15em] font-medium transition-all duration-300 rounded-sm ${activeCategory === cat.name ? "bg-charcoal text-white" : "bg-ivory text-charcoal/60 hover:text-charcoal border border-gold/15"}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sub-filters */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-10 reveal">
            {[
              { key: "all", label: "All Pieces" },
              { key: "featured", label: "Featured" },
              { key: "bestseller", label: "Best Sellers" },
              { key: "new", label: "New Arrivals" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setFilterTab(tab.key as typeof filterTab)} className={`text-xs uppercase tracking-[0.15em] font-medium pb-1 transition-all duration-300 border-b-2 ${filterTab === tab.key ? "text-gold border-gold" : "text-charcoal/40 border-transparent hover:text-charcoal/60"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {isLoading ? (
              [...Array(8)].map((_, idx) => (
                <div key={`prod-skel-${idx}`} className="flex flex-col">
                  <div className="aspect-[3/4] rounded-sm skeleton mb-4" />
                  <div className="px-1 flex flex-col gap-2">
                    <div className="h-4 skeleton w-4/5" />
                    <div className="h-3 skeleton w-1/3" />
                    <div className="h-9 skeleton w-full mt-3" />
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="font-serif text-xl text-charcoal/40">No pieces found</p>
                <button onClick={() => { setActiveCategory("All"); setFilterTab("all"); setSearchQuery(""); }} className="mt-4 text-gold text-sm hover:underline">
                  View all collections
                </button>
              </div>
            ) : (
              filteredProducts.map((product, idx) => (
                <div key={product.id} className="product-card-hover group reveal h-full flex flex-col" style={{ transitionDelay: `${(idx % 4) * 0.1}s` }}>
                  {/* Product Image */}
                  <div className="relative overflow-hidden rounded-sm aspect-[3/4] bg-cream-dark mb-4">
                    <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw" className="product-image object-cover transition-transform duration-700" />

                    {/* Hover Overlay */}
                    <div className="product-overlay absolute inset-0 bg-charcoal/10 opacity-0 transition-opacity duration-300 flex items-end justify-center pb-4 gap-2">
                      <button onClick={() => setQuickViewProduct(product)} className="bg-cream text-charcoal p-2.5 rounded-sm hover:bg-gold hover:text-white transition-colors shadow-md">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button disabled={!!product.outOfStock} onClick={() => addToCart(product)} className={`p-2.5 rounded-sm shadow-md transition-colors ${product.outOfStock ? 'bg-charcoal/30 text-white/50 cursor-not-allowed' : 'bg-charcoal text-white hover:bg-gold'}`}>
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {product.newArrival && <span className="bg-sage text-white text-[10px] px-2.5 py-1 uppercase tracking-wider font-medium">New</span>}
                      {product.bestSeller && <span className="bg-gold text-white text-[10px] px-2.5 py-1 uppercase tracking-wider font-medium">Best Seller</span>}
                      {product.originalPrice && <span className="bg-rose text-white text-[10px] px-2.5 py-1 uppercase tracking-wider font-medium">-{Math.round((1 - product.price / product.originalPrice) * 100)}%</span>}
                      {product.outOfStock && <span className="bg-charcoal/80 text-white text-[10px] px-2.5 py-1 uppercase tracking-wider font-medium">Out of Stock</span>}
                    </div>

                    {/* Wishlist */}
                    <button onClick={() => toggleWishlist(product.id)} className="absolute top-3 right-3 p-2 rounded-full bg-cream/80 backdrop-blur-sm hover:bg-cream transition-colors shadow-sm">
                      <Heart className={`w-4 h-4 transition-colors ${wishlist.includes(product.id) ? "fill-gold text-gold" : "text-charcoal/40"}`} />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="px-1 flex-1 flex flex-col">
                    <h3 className="font-serif text-sm sm:text-base text-charcoal group-hover:text-gold transition-colors duration-300 mb-1">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-charcoal font-medium text-sm">₹{product.price}</span>
                      {product.originalPrice && <span className="text-charcoal/30 text-xs line-through">₹{product.originalPrice}</span>}
                    </div>

                    {/* Size Selector */}
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {product.sizes.map((size) => (
                          <button key={size} onClick={() => selectSize(product.id, size)} className={`size-option px-2.5 py-1 text-[11px] border border-charcoal/15 rounded-sm font-medium ${selectedSizes[product.id] === size ? "selected" : "text-charcoal/50 hover:border-charcoal/40"}`}>
                            {size}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Add to Cart */}
                    <button
                      disabled={!!product.outOfStock}
                      onClick={() => addToCart(product)}
                      className={`w-full mt-auto py-2.5 border text-[11px] uppercase tracking-[0.15em] font-medium rounded-sm transition-all duration-300 ${
                        product.outOfStock
                          ? 'border-charcoal/10 text-charcoal/30 bg-charcoal/5 cursor-not-allowed'
                          : 'border-charcoal/20 text-charcoal hover:bg-charcoal hover:text-white'
                      }`}
                    >
                      {product.outOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Marquee Banner */}
      <section className="bg-charcoal py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap min-w-max w-fit hover:[animation-play-state:paused]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 mx-4">
              {["Anti-Tarnish Guarantee", "✦", "Free Shipping on Orders", "✦", "Hand-Picked Collections", "✦", "Premium Quality", "✦", "Made with Love", "✦"].map((text, j) => (
                <span key={j} className={`text-xs uppercase tracking-[0.25em] ${text === "✦" ? "text-gold" : "text-white/60"}`}>{text}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Our Story Section */}
      <section id="story" className="py-16 sm:py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image Side */}
            <div className="reveal-left">
              <div className="relative">
                <Image src="https://images.pexels.com/photos/4155247/pexels-photo-4155247.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700" alt="Our Story" width={700} height={875} className="w-full aspect-[4/5] object-cover rounded-sm" />
                <div className="absolute -bottom-6 -right-6 w-32 h-32 sm:w-48 sm:h-48 bg-gold/10 rounded-sm -z-10" />
              </div>
            </div>

            {/* Text Side */}
            <div className="reveal-right">
              <p className="text-gold text-xs uppercase tracking-[0.3em] mb-4">Our Story</p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal mb-6 leading-tight">
                Crafted with<br />
                <span className="italic text-gold">Passion & Love</span>
              </h2>
              <div className="w-12 h-px bg-gold mb-8" />
              <p className="text-charcoal/60 leading-relaxed mb-6">
                Founded by two sisters from Bhiwandi, Thane, <strong className="text-charcoal">Riii Jewels</strong> brings you hand-picked, premium anti-tarnish jewelry. We believe that true elegance should not be reserved for special occasions—it should be accessible every day.
              </p>
              <p className="text-charcoal/60 leading-relaxed mb-8">
                Explore our carefully curated collections designed for the modern woman. Each piece is selected with love, ensuring you receive only the finest quality that stands the test of time.
              </p>
              <div className="flex flex-wrap gap-6 sm:gap-8 mb-8">
                {[
                  { num: "500+", label: "Happy Customers" },
                  { num: "200+", label: "Unique Designs" },
                  { num: "100%", label: "Anti-Tarnish" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-serif text-2xl text-gold">{stat.num}</p>
                    <p className="text-[10px] sm:text-xs text-charcoal/40 uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => scrollTo("collection")} className="w-full sm:w-auto justify-center bg-charcoal text-white px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300 flex items-center gap-2 group">
                Explore Collection <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="text-gold text-xs uppercase tracking-[0.3em] mb-3">Testimonials</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-charcoal">What Our Clients Say</h2>
          </div>

          <div className="reveal">
            <div className="text-center">
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(testimonials[activeTestimonial]?.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="font-serif text-xl sm:text-2xl text-charcoal italic leading-relaxed mb-8 min-h-[80px]">
                &ldquo;{testimonials[activeTestimonial]?.text}&rdquo;
              </p>
              {testimonials[activeTestimonial]?.imageUrl && (
                <div className="flex justify-center mb-6">
                  <Image src={testimonials[activeTestimonial].imageUrl!} alt="Customer photo" width={96} height={96} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-full border-2 border-ivory shadow-md" />
                </div>
              )}
              <p className="text-sm text-charcoal font-medium tracking-wider uppercase">{testimonials[activeTestimonial]?.name}</p>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, idx) => (
                <button key={idx} onClick={() => setActiveTestimonial(idx)} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === activeTestimonial ? "bg-gold w-6" : "bg-charcoal/20"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 sm:py-24 bg-charcoal relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-40 h-40 border border-gold rounded-full" />
          <div className="absolute bottom-10 right-10 w-60 h-60 border border-gold rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-gold rounded-full" />
        </div>
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 reveal">
          <Sparkles className="w-6 h-6 text-gold mx-auto mb-4" />
          <h2 className="font-serif text-3xl sm:text-4xl text-white mb-4">Join Our World</h2>
          <p className="text-white/50 text-sm mb-8">Be the first to know about new arrivals, exclusive offers, and styling tips.</p>
          {newsletterSubmitted ? (
            <div className="flex items-center justify-center gap-2 text-gold">
              <Check className="w-5 h-5" />
              <span className="font-serif text-lg">Welcome to the family!</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewsletter()}
                className="flex-1 bg-white/5 border border-white/20 px-5 py-3.5 text-white text-sm font-sans placeholder:text-white/30 focus:border-gold focus:ring-0 outline-none w-full"
              />
              <button onClick={handleNewsletter} className="w-full sm:w-auto bg-gold hover:bg-gold-dark text-white px-6 py-3.5 text-xs uppercase tracking-[0.15em] font-medium transition-colors">
                Subscribe
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div className="reveal-left">
              <p className="text-gold text-xs uppercase tracking-[0.3em] mb-3">Get in Touch</p>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal mb-6">Connect With Us</h2>
              <div className="w-12 h-px bg-gold mb-8" />
              <p className="text-charcoal/60 leading-relaxed mb-8">
                Have questions? Want to order wholesale? We&apos;d love to hear from you. Send us a direct message on Instagram or reach out via WhatsApp.
              </p>
              <div className="space-y-4">
                <a href="https://instagram.com/riii_jewels.by_areesha" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-charcoal/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 rounded-full border border-charcoal/15 flex items-center justify-center group-hover:border-gold transition-colors">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Instagram</p>
                    <p className="text-xs text-charcoal/40">@riii_jewels.by_areesha</p>
                  </div>
                </a>
                <a href="https://wa.me/917020059293?text=Hi%20Riii%20Jewels,%20I%20need%20help%20with%20your%20products!" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-charcoal/70 hover:text-gold transition-colors group">
                  <div className="w-10 h-10 rounded-full border border-charcoal/15 flex items-center justify-center group-hover:border-gold transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-charcoal/40">+91 7020059293</p>
                  </div>
                </a>
                <div className="flex items-center gap-4 text-charcoal/70">
                  <div className="w-10 h-10 rounded-full border border-charcoal/15 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-xs text-charcoal/40">Bhiwandi, Thane</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Track Orders */}
            <div className="reveal-right">
              <p className="text-gold text-xs uppercase tracking-[0.3em] mb-3">Order Status</p>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal mb-6">Track My Orders</h2>
              <div className="w-12 h-px bg-gold mb-8" />
              <p className="text-charcoal/60 text-sm mb-6">Enter your phone number used at the time of ordering to check your order status.</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-0">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrackOrders()}
                  className="flex-1 bg-cream border border-charcoal/10 px-5 py-3.5 text-charcoal text-sm placeholder:text-charcoal/30 w-full"
                />
                <button onClick={handleTrackOrders} className="w-full sm:w-auto bg-charcoal text-white px-6 py-3.5 text-xs uppercase tracking-[0.15em] font-medium hover:bg-gold transition-colors">
                  Track
                </button>
              </div>

              {trackedOrders.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {((trackedOrders as Array<any>)).map((order, idx) => (
                    <div key={idx} className="bg-cream p-4 rounded-sm border border-charcoal/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-xs text-charcoal/60">{order.id}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm font-medium ${order.status === "Delivered" ? "bg-sage/10 text-sage" :
                          order.status === "Confirmed" ? "bg-gold/10 text-gold" :
                            "bg-charcoal/8 text-charcoal/60"
                          }`}>{order.status}</span>
                      </div>
                      <p className="text-sm font-medium text-charcoal">₹{order.totalAmount}</p>
                      {order.expectedDeliveryDate && order.status === "Confirmed" && (
                        <p className="text-xs text-charcoal/50 mt-1">🚚 Est. Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : trackPhone ? (
                <p className="mt-6 text-sm text-charcoal/40">No orders found for this number.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="font-serif text-2xl gold-shimmer mb-4">Riii Jewels</h3>
              <p className="text-white/40 text-sm leading-relaxed">Hand-picked, premium anti-tarnish jewelry crafted for the modern woman.</p>
              <div className="flex gap-3 mt-6">
                <a href="https://instagram.com/riii_jewels.by_areesha" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-colors">
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a href="https://wa.me/917020059293" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white text-xs uppercase tracking-[0.2em] font-medium mb-4">Quick Links</h4>
              <div className="flex flex-col gap-2.5">
                {["Home", "Collection", "Our Story", "Contact"].map((link) => (
                  <button key={link} onClick={() => scrollTo(link.toLowerCase() === "home" ? "hero" : link.toLowerCase())} className="text-white/40 text-sm hover:text-gold transition-colors text-left">
                    {link}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-white text-xs uppercase tracking-[0.2em] font-medium mb-4">Categories</h4>
              <div className="flex flex-col gap-2.5">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => { setActiveCategory(cat.name); scrollTo("collection"); }} className="text-white/40 text-sm hover:text-gold transition-colors text-left">
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white text-xs uppercase tracking-[0.2em] font-medium mb-4">Contact</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-white/40 text-sm"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> Bhiwandi, Thane</div>
                <div className="flex items-center gap-2 text-white/40 text-sm"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> +91 7020059293</div>
                <div className="flex items-center gap-2 text-white/40 text-sm"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> riiijewels@gmail.com</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/20 text-xs">&copy; 2026 Riii Jewels by Areesha. All Rights Reserved.</p>
            <p className="text-white/20 text-xs flex items-center gap-1">Made with <Heart className="w-3 h-3 fill-gold text-gold" /> in India</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a href="https://wa.me/917020059293?text=Hi%20Riii%20Jewels,%20I%20need%20help%20with%20your%20products!" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20BD5A] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* Cart Sidebar has been moved to /cart */}

      {/* Wishlist Sidebar */}
      {isWishlistOpen && (
        <div className="fixed inset-0 z-[100] modal-overlay animate-fade-in" onClick={() => setIsWishlistOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-cream shadow-2xl animate-slide-in-right flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-charcoal/5">
              <div>
                <h3 className="font-serif text-xl text-charcoal">Wishlist</h3>
                <p className="text-xs text-charcoal/40 mt-0.5">{wishlist.length} saved items</p>
              </div>
              <button onClick={() => setIsWishlistOpen(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {wishlist.length === 0 ? (
                <div className="text-center py-20">
                  <Heart className="w-12 h-12 text-charcoal/10 mx-auto mb-4" />
                  <p className="font-serif text-lg text-charcoal/30">Your wishlist is empty</p>
                  <button onClick={() => { setIsWishlistOpen(false); scrollTo("collection"); }} className="mt-4 text-gold text-sm hover:underline">
                    Explore collection
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.filter((p) => wishlist.includes(p.id)).map((product) => (
                    <div key={product.id} className="flex gap-4 items-center">
                      <Image src={product.imageUrl} alt={product.name} width={64} height={80} className="w-16 h-20 object-cover rounded-sm shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-serif text-sm text-charcoal">{product.name}</h4>
                        <p className="text-sm text-charcoal font-medium">₹{product.price}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => { addToCart(product); }} className="p-2 text-charcoal/40 hover:text-gold transition-colors"><ShoppingBag className="w-4 h-4" /></button>
                        <button onClick={() => toggleWishlist(product.id)} className="p-2 text-charcoal/40 hover:text-rose transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[100] modal-overlay animate-fade-in flex items-center justify-center p-4" onClick={() => setQuickViewProduct(null)}>
          <div className="bg-ivory w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="grid md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square md:aspect-auto md:min-h-[400px]">
                <Image src={quickViewProduct.imageUrl} alt={quickViewProduct.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 w-8 h-8 bg-cream/90 rounded-full flex items-center justify-center text-charcoal hover:text-gold transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Details */}
              <div className="p-6 sm:p-8 flex flex-col">
                <div>
                  {quickViewProduct.newArrival && <span className="text-[10px] uppercase tracking-[0.2em] text-sage font-medium mr-2">New Arrival</span>}
                  {quickViewProduct.bestSeller && <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-medium mr-2">Best Seller</span>}
                  {quickViewProduct.outOfStock && <span className="text-[10px] uppercase tracking-[0.2em] text-rose font-medium">Out of Stock</span>}
                  <h3 className="font-serif text-2xl sm:text-3xl text-charcoal mt-2 mb-3">{quickViewProduct.name}</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl font-light text-charcoal">₹{quickViewProduct.price}</span>
                    {quickViewProduct.originalPrice && <span className="text-lg text-charcoal/30 line-through">₹{quickViewProduct.originalPrice}</span>}
                    {quickViewProduct.originalPrice && <span className="text-xs bg-rose/10 text-rose px-2 py-0.5 rounded-sm font-medium">{Math.round((1 - quickViewProduct.price / quickViewProduct.originalPrice) * 100)}% OFF</span>}
                  </div>
                  <p className="text-charcoal/50 text-sm leading-relaxed mb-6">{quickViewProduct.description}</p>
                </div>

                {/* Size Selector */}
                {quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-charcoal/40 mb-3">Select Size</p>
                    <div className="flex flex-wrap gap-2">
                      {quickViewProduct.sizes.map((size) => (
                        <button key={size} onClick={() => selectSize(quickViewProduct.id, size)} className={`size-option px-4 py-2 text-sm border border-charcoal/15 rounded-sm font-medium ${selectedSizes[quickViewProduct.id] === size ? "selected" : "text-charcoal/60 hover:border-charcoal/40"}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                  <button
                    disabled={!!quickViewProduct.outOfStock}
                    onClick={() => { addToCart(quickViewProduct); setQuickViewProduct(null); }}
                    className={`flex-1 py-3.5 text-xs uppercase tracking-[0.15em] font-medium transition-colors duration-300 flex items-center justify-center gap-2 ${
                      quickViewProduct.outOfStock
                        ? 'bg-charcoal/20 text-charcoal/40 cursor-not-allowed'
                        : 'bg-charcoal text-white hover:bg-gold'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" /> {quickViewProduct.outOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  <button onClick={() => toggleWishlist(quickViewProduct.id)} className="w-12 border border-charcoal/15 flex items-center justify-center hover:border-gold transition-colors">
                    <Heart className={`w-4 h-4 ${wishlist.includes(quickViewProduct.id) ? "fill-gold text-gold" : "text-charcoal/40"}`} />
                  </button>
                </div>

                {/* Trust */}
                <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-charcoal/5">
                  {[
                    { icon: Shield, text: "Anti-Tarnish" },
                    { icon: Truck, text: "Fast Delivery" },
                    { icon: RotateCcw, text: "7-Day Returns" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-1.5 text-charcoal/30 text-[11px]">
                      <item.icon className="w-3.5 h-3.5" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] modal-overlay animate-fade-in flex items-center justify-center p-4" onClick={() => setIsCheckoutOpen(false)}>
          <div className="bg-ivory w-full max-w-md max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-2xl text-charcoal">Checkout</h3>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Shipping */}
              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-charcoal/40 mb-2">Shipping Details</p>
                  <input id="c-name" type="text" placeholder="Full Name" className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30" />
                  <input id="c-phone" type="tel" placeholder="WhatsApp Number" className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30" />
                  <textarea id="c-address" placeholder="Complete Delivery Address" rows={3} className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30 resize-none" />

                  <div className="bg-cream p-4 rounded-sm mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-charcoal/50">Subtotal</span>
                      <span className="text-charcoal">₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-charcoal/50">Shipping</span>
                      <span className="text-sage text-xs">{cartTotal >= 999 ? "FREE" : "₹49"}</span>
                    </div>
                    <div className="border-t border-charcoal/10 mt-2 pt-2 flex justify-between">
                      <span className="text-charcoal font-medium">Total</span>
                      <span className="font-serif text-lg text-charcoal">₹{cartTotal + (cartTotal >= 999 ? 0 : 49)}</span>
                    </div>
                  </div>

                  <button onClick={() => setCheckoutStep(2)} className="w-full bg-charcoal text-white py-3.5 text-xs uppercase tracking-[0.15em] font-medium hover:bg-gold transition-colors duration-300">
                    Continue to Payment
                  </button>
                </div>
              )}

              {/* Step 2: Payment Info */}
              {checkoutStep === 2 && (
                <div className="space-y-4 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-charcoal/40 mb-4">Payment</p>
                  <div className="bg-cream p-6 rounded-sm">
                    <p className="font-serif text-lg text-charcoal mb-1">Total Amount</p>
                    <p className="font-serif text-3xl text-gold">₹{cartTotal + (cartTotal >= 999 ? 0 : 49)}</p>
                  </div>
                  <div className="bg-cream p-6 rounded-sm text-left">
                    <p className="text-sm font-medium text-charcoal mb-2">Pay via UPI</p>
                    <p className="text-xs text-charcoal/40">GPAY: 7020059293</p>
                    <p className="text-xs text-charcoal/40">Name: Areesha</p>
                  </div>
                  <p className="text-xs text-charcoal/40">After payment, click below to confirm your order. We&apos;ll verify and contact you on WhatsApp.</p>
                  <button onClick={handleCheckout} className="w-full bg-gold text-white py-3.5 text-xs uppercase tracking-[0.15em] font-medium hover:bg-gold-dark transition-colors duration-300">
                    Confirm & Place Order
                  </button>
                  <button onClick={() => setCheckoutStep(1)} className="w-full text-charcoal/40 text-xs hover:text-charcoal transition-colors">
                    ← Back to shipping
                  </button>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {checkoutStep === 3 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-sage" />
                  </div>
                  <h3 className="font-serif text-2xl text-charcoal mb-2">Order Confirmed!</h3>
                  <p className="text-charcoal/40 text-sm mb-6">Your order has been placed successfully</p>
                  <div className="bg-cream p-4 rounded-sm mb-6">
                    <p className="text-xs text-charcoal/40 mb-1">Order ID</p>
                    <p className="font-mono text-lg text-charcoal tracking-wider">{orderId}</p>
                  </div>
                  <p className="text-xs text-charcoal/30 mb-6">Save this Order ID for reference. We&apos;ll contact you on WhatsApp shortly.</p>
                  <button onClick={() => { setIsCheckoutOpen(false); setCheckoutStep(1); }} className="w-full bg-charcoal text-white py-3.5 text-xs uppercase tracking-[0.15em] font-medium hover:bg-gold transition-colors duration-300">
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track Orders Modal */}
      {isOrdersModalOpen && (
        <div className="fixed inset-0 z-[100] modal-overlay animate-fade-in flex items-center justify-center p-4" onClick={() => setIsOrdersModalOpen(false)}>
          <div className="bg-ivory w-full max-w-md max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl animate-scale-in p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-charcoal">Track Orders</h3>
              <button onClick={() => setIsOrdersModalOpen(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-0 mb-6">
              <input type="tel" placeholder="Phone Number" value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTrackOrders()} className="flex-1 bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30" />
              <button onClick={handleTrackOrders} className="bg-charcoal text-white px-5 py-3 text-xs uppercase tracking-wider font-medium hover:bg-gold transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
            {trackedOrders.length > 0 ? (
              <div className="space-y-3">
                {((trackedOrders as Array<any>)).map((order, idx) => (
                  <div key={idx} className="bg-cream p-4 rounded-sm border border-charcoal/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs text-charcoal/50">{order.id}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm font-medium ${order.status === "Delivered" ? "bg-sage/10 text-sage" :
                        order.status === "Confirmed" ? "bg-gold/10 text-gold" :
                          "bg-charcoal/8 text-charcoal/60"
                        }`}>{order.status}</span>
                    </div>
                    <p className="text-sm font-medium text-charcoal">₹{order.totalAmount}</p>
                    {order.expectedDeliveryDate && order.status === "Confirmed" && (
                      <p className="text-xs text-charcoal/50 mt-1">🚚 Est. Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-charcoal/30 text-sm py-8">Enter your phone number to view orders</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
