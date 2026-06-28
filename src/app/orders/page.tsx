"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle, Truck, Clock, Star, Camera, X, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getOrdersByUserId, addFeedback, getFeedbackByOrderId, uploadImage, Order } from "@/lib/firebase/services";
import AuthModal from "@/components/AuthModal";

const ORDER_STEPS = [
  { key: "Placed", label: "Order Placed", icon: Package, description: "Your order has been received." },
  { key: "Confirmed", label: "Order Confirmed", icon: CheckCircle, description: "Payment verified & confirmed." },
  { key: "Delivered", label: "Delivered", icon: Truck, description: "Order delivered to you!" },
];

function getStepIndex(status: string) {
  if (status === "Placed") return 0;
  if (status === "Confirmed") return 1;
  if (status === "Delivered") return 2;
  return 0;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${star <= (hovered || value) ? "fill-gold text-gold" : "text-charcoal/20"
              }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Feedback state
  const [feedbackModal, setFeedbackModal] = useState<{
    orderId: string;
    customerName: string;
  } | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackPhoto, setFeedbackPhoto] = useState<File | null>(null);
  const [feedbackPhotoPreview, setFeedbackPhotoPreview] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [submittedOrderIds, setSubmittedOrderIds] = useState<Set<string>>(new Set());
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const feedbackFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      if (user) {
        fetchOrders();
      } else {
        setOrdersLoading(false);
      }
    }
  }, [user, loading]);

  const fetchOrders = async () => {
    try {
      const data = await getOrdersByUserId(user!.uid);
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(sorted);

      // Check which delivered orders already have feedback
      const deliveredOrders = sorted.filter(o => o.status === "Delivered");
      const feedbackChecks = await Promise.all(
        deliveredOrders.map(async (o) => {
          const fb = await getFeedbackByOrderId(o.id!);
          return fb ? o.id! : null;
        })
      );
      setSubmittedOrderIds(new Set(feedbackChecks.filter(Boolean) as string[]));
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handlePhotoChange = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFeedbackPhoto(file);
    const reader = new FileReader();
    reader.onload = e => setFeedbackPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openFeedbackModal = (orderId: string, customerName: string) => {
    setFeedbackModal({ orderId, customerName });
    setRating(0);
    setFeedbackText("");
    setFeedbackPhoto(null);
    setFeedbackPhotoPreview(null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackModal || rating === 0) {
      alert("Please select a star rating.");
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      let photoUrl: string | undefined;
      if (feedbackPhoto) {
        photoUrl = await uploadImage(feedbackPhoto);
      }
      await addFeedback({
        orderId: feedbackModal.orderId,
        customerName: feedbackModal.customerName,
        rating,
        text: feedbackText || undefined,
        photoUrl,
      });
      setSubmittedOrderIds(prev => new Set([...prev, feedbackModal.orderId]));
      setFeedbackModal(null);
      setShowSuccessPopup(true);
    } catch (e) {
      console.error(e);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[60] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm border border-charcoal/10 text-center animate-scale-in">
            <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-sage" />
            </div>
            <h2 className="font-serif text-2xl text-charcoal mb-2">Thank You!</h2>
            <p className="text-sm text-charcoal/60 mb-6 leading-relaxed">
              Your feedback has been successfully submitted and will appear on our website after review. 💛
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full bg-gold hover:bg-gold-dark text-white px-6 py-3 text-xs uppercase tracking-wider rounded-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-charcoal/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-xl text-charcoal">Rate Your Order</h2>
                <p className="text-xs text-charcoal/40 mt-0.5">Share your experience with us</p>
              </div>
              <button onClick={() => setFeedbackModal(null)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wider text-charcoal/50 mb-3">Your Rating <span className="text-red-400">*</span></p>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <p className="text-sm text-gold mt-2">
                  {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Very Good" : "Excellent! ✨"}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Your Review <span className="text-charcoal/30">(Optional)</span></label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Tell us about your experience..."
                className="w-full bg-cream border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-gold outline-none transition-colors resize-none rounded-sm"
              />
            </div>

            {/* Photo Upload */}
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Add a Photo <span className="text-charcoal/30">(Optional)</span></label>
              <div
                onClick={() => feedbackFileRef.current?.click()}
                className="border-2 border-dashed border-charcoal/15 hover:border-gold/50 rounded-sm p-4 text-center cursor-pointer transition-colors"
              >
                {feedbackPhotoPreview ? (
                  <div className="space-y-2">
                    <img src={feedbackPhotoPreview} alt="Preview" className="max-h-32 mx-auto rounded-sm object-contain" />
                    <p className="text-xs text-charcoal/40">Click to change photo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-6 h-6 text-charcoal/25 mx-auto" />
                    <p className="text-sm text-charcoal/50">Click to upload a photo</p>
                    <p className="text-xs text-charcoal/30">PNG, JPG supported</p>
                  </div>
                )}
              </div>
              <input
                ref={feedbackFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f); }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setFeedbackModal(null)}
                className="flex-1 border border-charcoal/15 text-charcoal/60 text-xs uppercase tracking-wider px-4 py-3 rounded-sm hover:border-charcoal/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback || rating === 0}
                className="flex-1 bg-gold text-white text-xs uppercase tracking-wider px-4 py-3 rounded-sm hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-charcoal/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-charcoal hover:text-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm tracking-wider uppercase">Back to Store</span>
          </Link>
          <div className="font-serif text-2xl font-semibold tracking-wide text-charcoal">Riii Jewels</div>
          <div className="w-24" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <p className="text-gold text-xs uppercase tracking-[0.3em] mb-2">Your Account</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-charcoal">My Orders</h1>
        </div>

        {loading || ordersLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-charcoal/30 text-sm tracking-wider uppercase">Loading...</div>
          </div>
        ) : !user ? (
          <div className="text-center py-32">
            <Package className="w-16 h-16 text-charcoal/10 mx-auto mb-6" />
            <h2 className="font-serif text-2xl text-charcoal mb-4">Login to view your orders</h2>
            <p className="text-charcoal/50 mb-8 text-sm">Sign in to track your orders and manage your account.</p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-block bg-charcoal text-white px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300"
            >
              Login / Register
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32">
            <Package className="w-16 h-16 text-charcoal/10 mx-auto mb-6" />
            <h2 className="font-serif text-2xl text-charcoal mb-4">No orders yet</h2>
            <p className="text-charcoal/50 mb-8 text-sm">You haven&apos;t placed any orders yet. Start exploring our collection!</p>
            <Link href="/#collection" className="inline-block bg-charcoal text-white px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => {
              const stepIndex = getStepIndex(order.status);
              const canLeaveFeedback = order.status === "Delivered" && !submittedOrderIds.has(order.id!);
              return (
                <div key={order.id} className="bg-white rounded-sm border border-charcoal/8 shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-cream px-6 py-4 border-b border-charcoal/5 flex flex-wrap gap-4 items-center justify-between">
                    <div>
                      <p className="text-xs text-charcoal/40 uppercase tracking-wider mb-1">Order ID</p>
                      <p className="font-mono text-sm text-charcoal font-medium">{order.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/40 uppercase tracking-wider mb-1">Date</p>
                      <p className="text-sm text-charcoal">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/40 uppercase tracking-wider mb-1">Total</p>
                      <p className="font-serif text-lg text-charcoal">₹{order.totalAmount}</p>
                    </div>
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full ${order.status === "Delivered" ? "bg-sage/15 text-sage" :
                          order.status === "Confirmed" ? "bg-gold/15 text-gold" :
                            "bg-charcoal/8 text-charcoal/60"
                        }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Expected Delivery Date Banner */}
                  {order.expectedDeliveryDate && order.status === "Confirmed" && (
                    <div className="px-6 py-3 bg-gold/8 border-b border-gold/15 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gold flex-shrink-0" />
                      <p className="text-sm text-charcoal">
                        <span className="font-medium text-gold">Expected Delivery:</span>{" "}
                        {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  )}

                  {/* Progress Tracker */}
                  <div className="px-6 py-8">
                    <div className="relative">
                      {/* Progress Bar */}
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-charcoal/10 z-0">
                        <div
                          className="h-full bg-gold transition-all duration-700"
                          style={{ width: `${(stepIndex / (ORDER_STEPS.length - 1)) * 100}%` }}
                        />
                      </div>

                      {/* Steps */}
                      <div className="relative z-10 flex justify-between">
                        {ORDER_STEPS.map((step, idx) => {
                          const isCompleted = idx <= stepIndex;
                          const isCurrent = idx === stepIndex;
                          return (
                            <div key={step.key} className="flex flex-col items-center text-center max-w-[100px]">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-all duration-300 border-2 ${isCompleted ? "bg-gold border-gold text-white" : "bg-white border-charcoal/15 text-charcoal/30"
                                } ${isCurrent ? "scale-110 shadow-lg shadow-gold/20" : ""}`}>
                                <step.icon className="w-5 h-5" />
                              </div>
                              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isCompleted ? "text-charcoal" : "text-charcoal/30"}`}>
                                {step.label}
                              </p>
                              <p className={`text-[10px] leading-tight ${isCompleted ? "text-charcoal/50" : "text-charcoal/20"}`}>
                                {step.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expected delivery for confirmed orders — shown below tracker */}
                    {order.expectedDeliveryDate && order.status === "Confirmed" && (
                      <p className="text-center text-xs text-charcoal/50 mt-6">
                        🚚 Estimated arrival by{" "}
                        <span className="font-semibold text-charcoal">
                          {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Feedback Button for Delivered Orders */}
                  {order.status === "Delivered" && (
                    <div className="px-6 pb-4">
                      {canLeaveFeedback ? (
                        <button
                          onClick={() => openFeedbackModal(order.id!, order.customerName)}
                          className="flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold text-xs uppercase tracking-wider px-4 py-2.5 rounded-sm hover:bg-gold hover:text-white transition-all duration-300"
                        >
                          <Star className="w-4 h-4" />
                          Rate Your Order
                        </button>
                      ) : submittedOrderIds.has(order.id!) ? (
                        <p className="text-xs text-sage flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Feedback submitted — thank you! 💛
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="px-6 pb-6 border-t border-charcoal/5 pt-4">
                      <p className="text-xs uppercase tracking-wider text-charcoal/40 mb-3">Items</p>
                      <div className="space-y-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-4">
                            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-sm flex-shrink-0" />}
                            <div className="flex-1">
                              <p className="text-sm text-charcoal font-medium">{item.name}</p>
                              <p className="text-xs text-charcoal/40">Qty: {item.quantity} {item.selectedSize && `· Size: ${item.selectedSize}`}</p>
                            </div>
                            <p className="text-sm text-charcoal font-medium">₹{item.price * item.quantity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Address */}
                  {order.address && (
                    <div className="px-6 pb-6 border-t border-charcoal/5 pt-4">
                      <p className="text-xs uppercase tracking-wider text-charcoal/40 mb-1">Delivery Address</p>
                      <p className="text-sm text-charcoal/70">{order.address}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
