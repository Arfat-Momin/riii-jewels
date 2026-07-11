"use client";

import { useState, useEffect } from "react";
import { subscribeToAllOrders, updateOrderStatus, Order } from "@/lib/firebase/services";
import { CheckCircle, Truck, Package, Eye, RefreshCw, Calendar, X, MessageSquare } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    orderId: string;
    deliveryDate: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllOrders((data) => {
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get a default date 5 days from today
  const defaultDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  };

  const openConfirmModal = (orderId: string) => {
    setConfirmModal({ orderId, deliveryDate: defaultDeliveryDate() });
  };

  const handleConfirmOrder = async () => {
    if (!confirmModal) return;
    const { orderId, deliveryDate } = confirmModal;
    setUpdatingId(orderId);
    setConfirmModal(null);
    try {
      await updateOrderStatus(orderId, "Confirmed", { expectedDeliveryDate: deliveryDate });
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status: "Confirmed", expectedDeliveryDate: deliveryDate } : o
        )
      );
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === "Delivered") return "bg-sage/15 text-sage";
    if (status === "Confirmed") return "bg-gold/15 text-gold";
    return "bg-charcoal/8 text-charcoal/60";
  };

  if (loading) {
    return (
      <div className="p-8 bg-cream min-h-screen flex items-center justify-center">
        <div className="text-charcoal/40 text-sm uppercase tracking-wider">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-cream min-h-screen">
      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-6 w-full max-w-sm border border-charcoal/10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl text-charcoal">Set Delivery Date</h2>
              <button onClick={() => setConfirmModal(null)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-charcoal/60 mb-4">
              Set the expected delivery date for the customer. This will be shown on their order tracking page.
            </p>
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Expected Delivery Date
              </label>
              <input
                type="date"
                value={confirmModal.deliveryDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setConfirmModal(prev => prev ? { ...prev, deliveryDate: e.target.value } : null)}
                className="w-full bg-cream border border-charcoal/15 px-4 py-2.5 text-sm text-charcoal rounded-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 border border-charcoal/15 text-charcoal/60 text-xs uppercase tracking-wider px-3 sm:px-4 py-2.5 rounded-sm hover:border-charcoal/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={!confirmModal.deliveryDate}
                className="flex-1 bg-gold text-white text-xs uppercase tracking-wider px-3 sm:px-4 py-2.5 rounded-sm hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox */}
      {viewingScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingScreenshot(null)}
        >
          <div className="max-w-lg w-full bg-white rounded-sm shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-charcoal uppercase tracking-wider">Payment Screenshot</p>
              <button onClick={() => setViewingScreenshot(null)} className="text-charcoal/40 hover:text-charcoal transition-colors text-lg leading-none">&times;</button>
            </div>
            <img src={viewingScreenshot} alt="Payment screenshot" className="w-full max-h-[70vh] object-contain rounded-sm" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-charcoal tracking-wide">Orders</h1>
          <p className="text-charcoal/40 text-xs md:text-sm mt-1">{orders.length} total orders</p>
        </div>
        <button
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-charcoal/60 hover:text-charcoal transition-colors border border-charcoal/15 px-3 md:px-4 py-2 rounded-sm"
          disabled
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="hidden xs:inline text-green-600">Live</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-24 bg-ivory rounded-xl border border-cream-dark">
          <Package className="w-12 h-12 text-charcoal/15 mx-auto mb-4" />
          <p className="text-charcoal/40 font-serif text-xl">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map(order => (
            <div key={order.id} className="bg-ivory rounded-xl border border-cream-dark shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border-b border-charcoal/5">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <p className="text-[10px] text-charcoal/40 uppercase tracking-wider mb-0.5">Order ID</p>
                    <p className="font-mono text-xs sm:text-sm text-charcoal font-medium">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-charcoal/40 uppercase tracking-wider mb-0.5">Date</p>
                    <p className="text-xs sm:text-sm text-charcoal">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-charcoal/40 uppercase tracking-wider mb-0.5">Total</p>
                    <p className="font-serif text-base sm:text-lg text-charcoal font-bold">₹{order.totalAmount}</p>
                  </div>
                  {order.expectedDeliveryDate && (
                    <div>
                      <p className="text-[10px] text-charcoal/40 uppercase tracking-wider mb-0.5">Exp. Delivery</p>
                      <p className="text-xs sm:text-sm text-gold font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-start sm:justify-end mt-2 sm:mt-0">
                  <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Details */}
              <div className="px-4 sm:px-6 py-5 grid md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-3">
                  <p className="text-[10px] text-charcoal/40 uppercase tracking-wider font-semibold">Customer Details</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-charcoal font-medium">{order.customerName}</p>
                    <p className="text-sm text-charcoal/60">📞 {order.phone}</p>
                    <p className="text-sm text-charcoal/60">📍 {order.address}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <p className="text-[10px] text-charcoal/40 uppercase tracking-wider font-semibold">Items Ordered</p>
                  <div className="space-y-2">
                    {order.items && order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-sm flex-shrink-0 border border-charcoal/10" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-charcoal font-medium truncate">{item.name}</p>
                          <p className="text-xs text-charcoal/40">Qty: {item.quantity} {item.selectedSize && `· Size: ${item.selectedSize}`}</p>
                        </div>
                        <p className="text-sm text-charcoal font-medium flex-shrink-0">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="px-4 sm:px-6 py-4 bg-cream border-t border-charcoal/5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                {/* Screenshot */}
                <div className="flex justify-start">
                  {order.paymentScreenshotUrl ? (
                    <button
                      onClick={() => setViewingScreenshot(order.paymentScreenshotUrl!)}
                      className="flex items-center gap-2 text-[11px] sm:text-xs text-gold hover:text-gold-dark transition-colors border border-gold/30 hover:border-gold/60 px-3 py-1.5 rounded-sm"
                    >
                      <Eye className="w-4 h-4" /> View Payment Screenshot
                    </button>
                  ) : (
                    <span className="text-xs text-charcoal/30 italic">No screenshot uploaded</span>
                  )}
                </div>

                {/* Status Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {order.status === "Placed" && (
                    <button
                      onClick={() => openConfirmModal(order.id!)}
                      disabled={updatingId === order.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gold text-white text-[10px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 py-2 rounded-sm hover:bg-gold-dark transition-colors disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4" />
                      {updatingId === order.id ? "Updating..." : "Confirm & Set Date"}
                    </button>
                  )}
                  {order.status === "Confirmed" && (
                    <button
                      onClick={() => handleStatusUpdate(order.id!, "Delivered")}
                      disabled={updatingId === order.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-sage text-white text-[10px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 py-2 rounded-sm hover:bg-sage/80 transition-colors disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      {updatingId === order.id ? "Updating..." : "Mark as Delivered"}
                    </button>
                  )}
                  {order.status === "Delivered" && (
                    <span className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sage text-[10px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 py-2">
                      <CheckCircle className="w-4 h-4" /> Delivered ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
