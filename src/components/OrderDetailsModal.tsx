import React, { useState } from 'react';
import { X, RotateCcw, ShoppingBag, MapPin, CreditCard, Calendar, CheckCircle, Clock, Truck, ChevronRight, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, CartItem, GroceryItem } from '../types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  groceries: GroceryItem[];
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean, freq?: 'weekly' | 'biweekly' | 'monthly') => void;
  onOpenCart: () => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  selectedOrderId?: string | null;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orders,
  groceries,
  onAddToCart,
  onOpenCart,
  onAddToast,
  selectedOrderId
}: OrderDetailsModalProps) {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(selectedOrderId || (orders.length > 0 ? orders[0].id : null));

  if (!isOpen) return null;

  const currentOrder = orders.find(o => o.id === activeOrderId) || (orders.length > 0 ? orders[0] : null);

  const handleReorderBasket = (order: Order) => {
    let readdedCount = 0;
    let skipped = 0;
    order.items.forEach(cartItem => {
      const live = groceries.find(g => g.id === cartItem.item.id);
      if (!live || live.stock <= 0) {
        skipped += 1;
        return;
      }
      const qty = Math.min(cartItem.quantity, live.stock);
      onAddToCart(live, qty, false);
      readdedCount += qty;
    });

    if (readdedCount === 0) {
      onAddToast('Reorder unavailable', 'None of those items are in stock right now.', 'warning');
      return;
    }

    onAddToast(
      'Reorder Successful',
      skipped > 0
        ? `Added ${readdedCount} in-stock items (skipped ${skipped} unavailable).`
        : `Added ${readdedCount} items from Order ${order.id} back into your cart.`,
      'success'
    );
    onClose();
    onOpenCart();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Delivered</span>;
      case 'out_for_delivery':
        return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full flex items-center gap-1"><Truck className="w-3.5 h-3.5 animate-bounce" /> Out for Delivery</span>;
      case 'processing':
        return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold rounded-full flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Packing Items</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 text-xs font-bold rounded-full">Pending</span>;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#161616]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl leading-tight">Order History & Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">View complete past grocery receipts & reorder in 1-click</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Grid: Sidebar Order List + Detail Panel */}
          {orders.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base">No Order History Found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You haven't placed any grocery orders yet. Place an order from the catalog to see detailed receipts here!
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-white/10">
              {/* Sidebar Orders List */}
              <div className="w-full md:w-80 overflow-y-auto max-h-48 md:max-h-none p-3 space-y-2 bg-slate-50/30 dark:bg-[#141414]">
                <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block">
                  Past Orders ({orders.length})
                </span>
                {orders.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setActiveOrderId(o.id)}
                    className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                      currentOrder?.id === o.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'bg-white dark:bg-[#181818] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">{o.id}</span>
                      {getStatusBadge(o.status)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {(() => {
                          const d = new Date(o.createdAt);
                          return Number.isNaN(d.getTime())
                            ? o.createdAt
                            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        })()}
                      </span>
                      <strong className="font-extrabold text-slate-900 dark:text-white">
                        {o.totalAmount.toLocaleString()} {o.currency}
                      </strong>
                    </div>
                  </button>
                ))}
              </div>

              {/* Order Detail View */}
              {currentOrder && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {/* Order Overview Header Banner */}
                  <div className="p-4 bg-linear-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono font-black text-lg text-slate-900 dark:text-white">{currentOrder.id}</h4>
                        {getStatusBadge(currentOrder.status)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Placed on {(() => {
                          const d = new Date(currentOrder.createdAt);
                          return Number.isNaN(d.getTime())
                            ? currentOrder.createdAt
                            : d.toLocaleString();
                        })()}
                      </p>
                    </div>

                    {/* ONE-CLICK REORDER BUTTON */}
                    <button
                      onClick={() => handleReorderBasket(currentOrder)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reorder Entire Basket</span>
                    </button>
                  </div>

                  {/* Delivery & Payment Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-white/5 rounded-2xl space-y-2 text-xs">
                      <span className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Delivery Address
                      </span>
                      <p className="font-bold text-slate-800 dark:text-white">{currentOrder.deliveryAddress.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{currentOrder.deliveryAddress.addressLine}</p>
                      <p className="text-slate-500 dark:text-slate-400">{currentOrder.deliveryAddress.phone}</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-white/5 rounded-2xl space-y-2 text-xs">
                      <span className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Payment Method
                      </span>
                      <p className="font-bold text-slate-800 dark:text-white uppercase">{currentOrder.paymentMethod.type}</p>
                      <p className="text-slate-500 dark:text-slate-400">{currentOrder.paymentMethod.accountName}</p>
                      <p className="font-mono text-slate-500 dark:text-slate-400">{currentOrder.paymentMethod.accountNumber}</p>
                    </div>
                  </div>

                  {/* Items Receipt Table */}
                  <div className="space-y-3">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Grocery Basket Items ({currentOrder.items.length})
                    </span>
                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                      {currentOrder.items.map((cartItem, idx) => (
                        <div key={idx} className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-white dark:bg-[#161616]">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={cartItem.item.imageUrl}
                              alt={cartItem.item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white truncate">
                                {cartItem.item.name}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {cartItem.item.price.toLocaleString()} MMK / {cartItem.item.unit}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block">
                              Qty: {cartItem.quantity}
                            </span>
                            <span className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              {(cartItem.item.price * cartItem.quantity).toLocaleString()} MMK
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Summary */}
                  <div className="p-4 bg-slate-50 dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{currentOrder.totalAmount.toLocaleString()} MMK</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Express Delivery Fee</span>
                      <span className="text-emerald-500 font-bold">FREE</span>
                    </div>
                    <div className="flex justify-between text-slate-900 dark:text-white font-extrabold text-sm pt-2 border-t border-slate-200 dark:border-white/10">
                      <span>Total Amount</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {currentOrder.totalAmount.toLocaleString()} {currentOrder.currency}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
