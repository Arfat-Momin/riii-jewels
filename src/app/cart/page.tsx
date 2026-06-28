"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Plus, Minus, X, Check, Upload, User, LogOut, Package, ChevronRight } from "lucide-react";
import Image from "next/image";
import { addOrder, updateUserProfile, getStoreSettings, StoreSettings, uploadImage } from "@/lib/firebase/services";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "firebase/auth";
import { auth, isMock } from "@/lib/firebase/config";
import AuthModal from "@/components/AuthModal";

export default function CartPage() {
  const { user, profile, setProfile } = useAuth();
  const [cart, setCart] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [orderId, setOrderId] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ upiId: "7020059293", upiName: "Areesha", upiQrUrl: "" });

  // Form details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Payment screenshot
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("riii_cart");
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch { }
    setIsLoaded(true);
    // Load store settings (UPI QR, etc.)
    getStoreSettings().then(s => setStoreSettings(prev => ({ ...prev, ...s })));
  }, []);

  // Auto-fill from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setCity(profile.city || "");
      setPincode(profile.pincode || "");
    }
  }, [profile]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("riii_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(1, updated[index].quantity + delta) };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = cartTotal;

  const handleScreenshotChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleScreenshotChange(file);
  };

  const handleShippingContinue = async () => {
    if (!name || !phone || !address || !city || !pincode) {
      alert("Please fill in all shipping details.");
      return;
    }
    if (user && !isMock) {
      try {
        await updateUserProfile(user.uid, { name, phone, address, city, pincode });
        if (setProfile && profile) {
          setProfile({ ...profile, name, phone, address, city, pincode });
        }
      } catch (e) {
        console.error("Failed to save address", e);
      }
    }
    setCheckoutStep(2);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!screenshotFile && !isMock) {
      alert("Please upload your payment screenshot before placing the order.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      let paymentScreenshotUrl = "";
      if (screenshotFile) {
        paymentScreenshotUrl = await uploadImage(screenshotFile);
      }

      const oid = await addOrder({
        customerName: name,
        phone,
        address: `${address}, ${city} - ${pincode}`,
        city,
        pincode,
        items: cart,
        totalAmount: finalTotal,
        userId: user?.uid || "",
        paymentScreenshotUrl,
      });
      setOrderId(oid);
      setCheckoutStep(3);
      setCart([]);
      localStorage.setItem("riii_cart", JSON.stringify([]));
    } catch (e) {
      console.error(e);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleLogout = async () => {
    if (!isMock) await signOut(auth);
  };

  if (!isLoaded) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>;

  // Step labels for progress bar
  const steps = ["Cart", "Shipping", "Payment"];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* ── Mobile-Optimized Header ── */}
      <header className="bg-white border-b border-charcoal/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2">
          {/* Back link — icon only on mobile, text on sm+ */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-charcoal hover:text-gold transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline font-medium text-xs tracking-wider uppercase">Continue Shopping</span>
          </Link>

          {/* Brand */}
          <div className="font-serif text-lg sm:text-2xl font-semibold tracking-wide text-charcoal absolute left-1/2 -translate-x-1/2">
            Riii Jewels
          </div>

          {/* User actions — icons on mobile, text+icon on sm+ */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {user ? (
              <>
                <Link
                  href="/orders"
                  className="flex items-center gap-1.5 text-charcoal/60 hover:text-charcoal transition-colors p-2 sm:p-0"
                  title="My Orders"
                >
                  <Package className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wider">My Orders</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-charcoal/60 hover:text-charcoal transition-colors p-2 sm:p-0 sm:ml-2"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wider">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 text-charcoal/60 hover:text-charcoal transition-colors p-2 sm:p-0"
              >
                <User className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs uppercase tracking-wider">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Step Progress Bar — only when cart has items and not on confirmation */}
        {cart.length > 0 && checkoutStep < 3 && (
          <div className="border-t border-charcoal/5 bg-cream/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-1 sm:gap-2">
              {steps.map((label, i) => (
                <div key={label} className="flex items-center gap-1 sm:gap-2">
                  <div className={`flex items-center gap-1.5 ${i <= checkoutStep ? "text-charcoal" : "text-charcoal/30"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${i < checkoutStep ? "bg-gold text-white" : i === checkoutStep ? "bg-charcoal text-white" : "bg-charcoal/10 text-charcoal/40"}`}>
                      {i < checkoutStep ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className="text-[10px] sm:text-xs uppercase tracking-wider font-medium">{label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight className={`w-3 h-3 mx-0.5 ${i < checkoutStep ? "text-gold" : "text-charcoal/20"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">

        {/* ── Order Confirmed ── */}
        {checkoutStep === 3 ? (
          <div className="max-w-xl mx-auto bg-white p-6 sm:p-12 text-center rounded-sm shadow-sm border border-charcoal/5 mt-4 sm:mt-0">
            <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-sage" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-charcoal mb-3">Order Placed!</h1>
            <p className="text-charcoal/60 mb-6 text-sm leading-relaxed">
              Your order has been placed. Our team will verify your payment and update the status shortly.
            </p>
            <div className="bg-cream p-4 sm:p-6 rounded-sm mb-6 text-left">
              <p className="text-xs text-charcoal/40 uppercase tracking-wider mb-1">Order Reference</p>
              <p className="font-mono text-lg sm:text-xl text-charcoal break-all">{orderId}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/orders" className="inline-block bg-charcoal text-white px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300 text-center">
                Track Order
              </Link>
              <Link href="/" className="inline-block border border-charcoal/20 text-charcoal px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-medium hover:border-charcoal transition-colors duration-300 text-center">
                Continue Shopping
              </Link>
            </div>
          </div>

        ) : cart.length === 0 ? (
          /* ── Empty Cart ── */
          <div className="text-center py-20 sm:py-32">
            <ShoppingBag className="w-14 h-14 text-charcoal/10 mx-auto mb-5" />
            <h1 className="font-serif text-2xl sm:text-3xl text-charcoal mb-3">Your bag is empty</h1>
            <p className="text-charcoal/50 mb-8 text-sm">Discover our premium collections and find something you love.</p>
            <Link href="/#collection" className="inline-block bg-charcoal text-white px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300">
              Explore Collection
            </Link>
          </div>

        ) : (
          /* ── Cart / Checkout Grid ── */
          /* Mobile: single column. Desktop: 2-col grid */
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-12">

            {/* ══ LEFT COLUMN: Steps ══ */}
            <div className="lg:col-span-7 xl:col-span-8 order-1">

              {/* ── Step 0: Cart Items ── */}
              {checkoutStep === 0 && (
                <>
                  <h1 className="font-serif text-2xl sm:text-3xl text-charcoal mb-5 sm:mb-8">
                    Shopping Bag ({cart.reduce((s, i) => s + i.quantity, 0)})
                  </h1>
                  <div className="space-y-4">
                    {cart.map((item, index) => (
                      <div key={`${item.id}-${index}`} className="flex gap-3 sm:gap-5 bg-white p-3 sm:p-4 rounded-sm border border-charcoal/5 shadow-sm">
                        {/* Product Image */}
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={96}
                          height={128}
                          className="w-20 h-24 sm:w-24 sm:h-32 object-cover rounded-sm flex-shrink-0"
                        />
                        {/* Product Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 className="font-serif text-base sm:text-lg text-charcoal leading-tight line-clamp-2">{item.name}</h3>
                              {item.selectedSize && (
                                <p className="text-xs text-charcoal/50 mt-1">Size: {item.selectedSize}</p>
                              )}
                              {/* Price shown on mobile below title */}
                              <p className="font-serif text-base text-charcoal font-medium mt-1 sm:hidden">
                                ₹{item.price * item.quantity}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(index)}
                              className="text-charcoal/30 hover:text-red-500 transition-colors p-1 shrink-0"
                            >
                              <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                          <div className="flex justify-between items-center mt-3">
                            {/* Qty controls */}
                            <div className="flex items-center border border-charcoal/15 rounded-sm bg-cream">
                              <button
                                onClick={() => updateQuantity(index, -1)}
                                className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-charcoal/50 hover:text-charcoal transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <span className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(index, 1)}
                                className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-charcoal/50 hover:text-charcoal transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                            {/* Price — hidden on mobile (shown above), visible on sm+ */}
                            <span className="hidden sm:block font-serif text-lg text-charcoal font-medium">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Step 1: Shipping ── */}
              {checkoutStep === 1 && (
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl text-charcoal mb-5 sm:mb-8">Shipping Details</h1>
                  <div className="bg-white p-4 sm:p-8 rounded-sm border border-charcoal/5 shadow-sm space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors rounded-sm"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Contact Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors rounded-sm"
                        placeholder="Your phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Full Address</label>
                      <textarea
                        rows={3}
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors resize-none rounded-sm"
                        placeholder="House no, Street, Landmark..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors rounded-sm"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Pincode</label>
                        <input
                          type="text"
                          value={pincode}
                          onChange={e => setPincode(e.target.value)}
                          className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors rounded-sm"
                          placeholder="Pincode"
                        />
                      </div>
                    </div>
                    {profile && (
                      <p className="text-xs text-charcoal/40 italic">Your address will be saved for future orders.</p>
                    )}
                    {/* Navigation buttons — stacked on mobile */}
                    <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                      <button
                        onClick={() => setCheckoutStep(0)}
                        className="text-charcoal/50 text-sm hover:text-charcoal transition-colors text-center sm:text-left py-2"
                      >
                        ← Back to Cart
                      </button>
                      <button
                        onClick={handleShippingContinue}
                        className="w-full sm:w-auto bg-charcoal text-white px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Payment ── */}
              {checkoutStep === 2 && (
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl text-charcoal mb-5 sm:mb-8">Payment</h1>
                  <div className="bg-white p-4 sm:p-8 rounded-sm border border-charcoal/5 shadow-sm space-y-5 sm:space-y-8">
                    {/* Amount */}
                    <div className="text-center py-2">
                      <p className="text-xs text-charcoal/50 mb-1 uppercase tracking-wider">Amount to Pay</p>
                      <p className="font-serif text-3xl sm:text-4xl text-gold">₹{finalTotal}</p>
                    </div>

                    {/* UPI Details */}
                    <div className="bg-cream p-4 sm:p-6 rounded-sm border border-charcoal/10">
                      <h4 className="font-medium text-charcoal mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-charcoal text-white flex items-center justify-center text-xs shrink-0">1</span>
                        Pay via UPI
                      </h4>
                      <div className="ml-0 sm:ml-8 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                        {/* QR Code */}
                        {storeSettings.upiQrUrl ? (
                          <div className="text-center shrink-0">
                            <div className="bg-white border-2 border-charcoal/10 rounded-xl p-3 inline-block shadow-sm relative w-36 h-36 sm:w-40 sm:h-40">
                              <Image
                                src={storeSettings.upiQrUrl}
                                alt="UPI QR Code"
                                fill
                                sizes="(max-width: 640px) 144px, 160px"
                                priority
                                unoptimized
                                className="object-contain p-2"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerHTML = '<span class="text-xs text-charcoal/40 text-center">Image unavailable</span>';
                                  }
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-charcoal/40 mt-2 uppercase tracking-wider">Scan to Pay</p>
                          </div>
                        ) : (
                          <div className="w-36 h-36 sm:w-40 sm:h-40 border-2 border-dashed border-charcoal/15 rounded-xl flex items-center justify-center shrink-0">
                            <p className="text-xs text-charcoal/30 text-center px-2">QR code not set</p>
                          </div>
                        )}
                        {/* Text details */}
                        <div className="space-y-2 text-center sm:text-left">
                          <p className="text-sm text-charcoal">
                            <span className="text-charcoal/50 text-xs uppercase tracking-wider block mb-0.5">UPI / GPay Number</span>
                            <strong className="text-base">{storeSettings.upiId || "7020059293"}</strong>
                          </p>
                          <p className="text-sm text-charcoal">
                            <span className="text-charcoal/50 text-xs uppercase tracking-wider block mb-0.5">Account Name</span>
                            <strong>{storeSettings.upiName || "Areesha"}</strong>
                          </p>
                          <p className="text-base font-bold text-gold mt-3">Amount: ₹{finalTotal}</p>
                          <p className="text-[11px] text-charcoal/40 leading-relaxed">
                            Open GPay / PhonePe / any UPI app → scan the QR or enter the number above → pay the exact amount.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Screenshot Upload */}
                    <div className="bg-cream p-4 sm:p-6 rounded-sm border border-charcoal/10">
                      <h4 className="font-medium text-charcoal mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-charcoal text-white flex items-center justify-center text-xs shrink-0">2</span>
                        Upload Payment Screenshot
                      </h4>
                      <div className="ml-8">
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-sm p-5 sm:p-8 text-center cursor-pointer transition-all duration-200 ${isDragging ? "border-gold bg-gold/5" : "border-charcoal/20 hover:border-charcoal/40"}`}
                        >
                          {screenshotPreview ? (
                            <div className="space-y-3">
                              <Image src={screenshotPreview} alt="Payment screenshot" width={400} height={400} className="max-h-40 sm:max-h-48 mx-auto rounded-sm object-contain" />
                              <p className="text-xs text-charcoal/50">Tap to replace</p>
                            </div>
                          ) : (
                            <div className="space-y-2 sm:space-y-3">
                              <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-charcoal/30 mx-auto" />
                              <p className="text-sm text-charcoal/60">
                                <span className="hidden sm:inline">Drag & drop or </span>
                                <span className="text-gold font-medium">Tap to upload</span>
                              </p>
                              <p className="text-xs text-charcoal/40">PNG, JPG supported</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScreenshotChange(f); }}
                        />
                      </div>
                    </div>

                    {/* Confirm note */}
                    <div className="bg-cream p-4 sm:p-6 rounded-sm border border-charcoal/10">
                      <h4 className="font-medium text-charcoal mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-charcoal text-white flex items-center justify-center text-xs shrink-0">3</span>
                        Place Your Order
                      </h4>
                      <p className="text-sm text-charcoal/60 ml-8 leading-relaxed">
                        After uploading your screenshot, tap below to confirm. Our admin will verify and update your order status.
                      </p>
                    </div>

                    {/* Navigation buttons */}
                    <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                      <button
                        onClick={() => setCheckoutStep(1)}
                        className="text-charcoal/50 text-sm hover:text-charcoal transition-colors text-center sm:text-left py-2"
                      >
                        ← Back to Shipping
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={isPlacingOrder}
                        className="w-full sm:w-auto bg-gold text-white px-8 py-4 text-xs uppercase tracking-[0.2em] font-bold hover:bg-gold-dark transition-colors duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPlacingOrder ? "Placing Order..." : "Confirm & Place Order"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ══ RIGHT COLUMN: Order Summary ══ */}
            {/* On mobile: shown below cart items (order-2), before checkout button */}
            {/* On desktop: sticky sidebar */}
            <div className="lg:col-span-5 xl:col-span-4 order-2">
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-sm border border-charcoal/5 shadow-sm lg:sticky lg:top-28">
                <h2 className="font-serif text-lg sm:text-xl text-charcoal mb-4 sm:mb-6">Order Summary</h2>

                {/* Items list */}
                <div className="space-y-2.5 mb-4 sm:mb-6">
                  {cart.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="w-10 h-10 object-cover rounded-sm flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-charcoal/70 truncate">{item.name}</p>
                        <p className="text-xs text-charcoal/40">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm text-charcoal/70 shrink-0">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-charcoal/10 pt-3 mb-3 space-y-2">
                  <div className="flex justify-between text-charcoal/60 text-sm">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-charcoal/60 text-sm">
                    <span>Delivery</span>
                    <span className="text-sage font-medium">FREE</span>
                  </div>
                </div>
                <div className="border-t border-charcoal/10 pt-3 mb-5 sm:mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal font-medium">Total</span>
                    <span className="font-serif text-xl sm:text-2xl text-charcoal">₹{finalTotal}</span>
                  </div>
                </div>

                {checkoutStep === 0 && (
                  user ? (
                    <button
                      onClick={() => setCheckoutStep(1)}
                      className="w-full bg-charcoal text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300"
                    >
                      Proceed to Checkout
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full bg-charcoal text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300"
                    >
                      Login to Checkout
                    </button>
                  )
                )}

                {/* Trust badges */}
                <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-charcoal/5 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-charcoal/30" />
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-charcoal/50">Secure Checkout</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-charcoal/30" />
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-charcoal/50">Anti-Tarnish Guarantee</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
