"use client";

import { useState, useEffect } from "react";
import { getAllFeedbacks, approveFeedback, deleteFeedback, Feedback } from "@/lib/firebase/services";
import { Star, CheckCircle, Trash2, RefreshCw, MessageSquare, Image as ImageIcon } from "lucide-react";

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await getAllFeedbacks();
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFeedbacks(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveFeedback(id);
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, approved: true } : f));
    } catch (e) {
      console.error(e);
      alert("Failed to approve feedback.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feedback? This cannot be undone.")) return;
    setProcessingId(id);
    try {
      await deleteFeedback(id);
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete feedback.");
    } finally {
      setProcessingId(null);
    }
  };

  const pending = feedbacks.filter(f => !f.approved);
  const approved = feedbacks.filter(f => f.approved);

  if (loading) {
    return (
      <div className="p-8 bg-cream min-h-screen flex items-center justify-center">
        <div className="text-charcoal/40 text-sm uppercase tracking-wider">Loading feedbacks...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-cream min-h-screen">
      {/* Photo Lightbox */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="max-w-lg w-full bg-white rounded-sm shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-charcoal uppercase tracking-wider">Customer Photo</p>
              <button onClick={() => setViewingPhoto(null)} className="text-charcoal/40 hover:text-charcoal transition-colors text-lg leading-none">&times;</button>
            </div>
            <img src={viewingPhoto} alt="Customer feedback photo" className="w-full max-h-[70vh] object-contain rounded-sm" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-charcoal tracking-wide">Customer Feedbacks</h1>
          <p className="text-charcoal/40 text-sm mt-1">
            {pending.length} pending · {approved.length} approved (shown on website)
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-charcoal/60 hover:text-charcoal transition-colors border border-charcoal/15 px-4 py-2 rounded-sm hover:border-charcoal/30"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-24 bg-ivory rounded-xl border border-cream-dark">
          <MessageSquare className="w-12 h-12 text-charcoal/15 mx-auto mb-4" />
          <p className="text-charcoal/40 font-serif text-xl">No feedbacks yet</p>
          <p className="text-charcoal/30 text-sm mt-2">Customer feedbacks will appear here after delivery.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Approvals */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest text-charcoal/50 font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block" /> Pending Approval ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.map(fb => (
                  <FeedbackCard
                    key={fb.id}
                    feedback={fb}
                    onApprove={() => handleApprove(fb.id!)}
                    onDelete={() => handleDelete(fb.id!)}
                    onViewPhoto={() => setViewingPhoto(fb.photoUrl!)}
                    isProcessing={processingId === fb.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest text-charcoal/50 font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sage inline-block" /> Approved & Live ({approved.length})
              </h2>
              <div className="space-y-4">
                {approved.map(fb => (
                  <FeedbackCard
                    key={fb.id}
                    feedback={fb}
                    onApprove={() => { }}
                    onDelete={() => handleDelete(fb.id!)}
                    onViewPhoto={() => setViewingPhoto(fb.photoUrl!)}
                    isProcessing={processingId === fb.id}
                    isApproved
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  feedback,
  onApprove,
  onDelete,
  onViewPhoto,
  isProcessing,
  isApproved = false,
}: {
  feedback: Feedback;
  onApprove: () => void;
  onDelete: () => void;
  onViewPhoto: () => void;
  isProcessing: boolean;
  isApproved?: boolean;
}) {
  return (
    <div className={`bg-ivory rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${isApproved ? "border-sage/30" : "border-cream-dark"}`}>
      <div className="px-6 py-5">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <p className="font-medium text-charcoal">{feedback.customerName}</p>
              {isApproved && (
                <span className="text-[10px] uppercase tracking-wider bg-sage/10 text-sage px-2 py-0.5 rounded-full font-semibold">
                  ✓ Live on Website
                </span>
              )}
            </div>
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= feedback.rating ? "fill-gold text-gold" : "text-charcoal/15"}`}
                />
              ))}
              <span className="text-xs text-charcoal/40 ml-2 mt-0.5">{feedback.rating}/5</span>
            </div>
            {feedback.text && (
              <p className="text-sm text-charcoal/70 italic leading-relaxed">"{feedback.text}"</p>
            )}
            <div className="flex gap-4 mt-3 text-xs text-charcoal/30">
              <span>Order: <span className="font-mono">{feedback.orderId}</span></span>
              <span>{new Date(feedback.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {/* Photo thumbnail */}
          {feedback.photoUrl && (
            <button onClick={onViewPhoto} className="flex-shrink-0 group relative">
              <img
                src={feedback.photoUrl}
                alt="Customer photo"
                className="w-20 h-20 object-cover rounded-sm border border-charcoal/10 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="w-5 h-5 text-white drop-shadow" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-3 bg-cream border-t border-charcoal/5 flex items-center gap-3">
        {!isApproved && (
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-gold text-white text-xs uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-gold-dark transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {isProcessing ? "Processing..." : "Approve & Publish"}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isProcessing}
          className="flex items-center gap-2 text-xs text-charcoal/40 hover:text-red-500 transition-colors border border-charcoal/10 hover:border-red-300 px-3 py-2 rounded-sm disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
