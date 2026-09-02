import React, { useState } from 'react';
import { Star, X, MessageSquare, MapPin, CheckCircle2, Heart } from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface FeedbackModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (orderId: string, rating: number, comment: string) => void | Promise<void>;
}

export default function FeedbackModal({
  order,
  isOpen,
  onClose,
  onSubmitFeedback
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Get first item's zone as the specific shop/zone for the review
  const specificZone = order.items[0]?.item.availabilityZone || 'Bahan Depot';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitFeedback(order.id, rating, comment);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch {
      /* parent shows toast */
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-999 flex items-center justify-center p-4 font-sans">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="feedback-form"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Header branding background decoration */}
            <div className="absolute top-0 inset-x-0 h-2 bg-linear-to-r from-emerald-500 via-teal-400 to-purple-500" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 mt-2">
              <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-lg text-emerald-500 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block">
                  Delivered successfully
                </span>
                <h3 className="font-display font-extrabold text-base md:text-lg text-slate-800 dark:text-white mt-0.5">
                  Order #{order.id}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Your groceries have been delivered to your doorstep. Rate your experience to help us improve service levels at our <span className="font-bold text-emerald-500 dark:text-emerald-400">{specificZone}</span> dispatch hub!
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating Section */}
              <div className="bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Rate Your Hub Delivery
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = hoverRating !== null ? star <= hoverRating : star <= rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-hidden"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            isActive
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mt-2 font-mono">
                  {rating === 5 ? '⭐⭐⭐⭐⭐ Excellent!' : rating === 4 ? '⭐⭐⭐⭐ Great' : rating === 3 ? '⭐⭐⭐ Good' : rating === 2 ? '⭐⭐ Fair' : '⭐ Needs Improvement'}
                </span>
              </div>

              {/* Shop/Zone Specific Review Message */}
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Your review will be shared directly with the <strong className="font-bold">{specificZone}</strong> store supervisors.
                </span>
              </div>

              {/* Text Review */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-slate-400" /> Share Your Experience (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the packing quality? Were your organic fruits fresh? Did the rider follow delivery instructions?"
                  className="w-full h-24 p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all resize-none shadow-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-[#1c1c1c] text-slate-500 hover:text-slate-700 dark:hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Skip Feedback
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="feedback-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center flex flex-col items-center justify-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4"
            >
              <Heart className="w-8 h-8 fill-emerald-500" />
            </motion.div>
            <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white">
              Thank You!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
              Your rating has been recorded. This feedback helps us keep the groceries fresh and dispatch swift!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
