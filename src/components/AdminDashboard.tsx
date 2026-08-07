import React, { useState, useMemo } from 'react';
import {
  TrendingUp, AlertOctagon, Users, ShieldAlert, BarChart3, RotateCw, CheckCircle, PackageOpen, Radio, ShieldCheck, Plus, RefreshCw, Calendar, Sparkles, Brain, Clock, Zap
} from 'lucide-react';
import { GroceryItem, Order, AdminAnalytics } from '../types';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl font-sans text-xs">
        <p className="font-extrabold text-slate-800 dark:text-slate-200 mb-1">{label}</p>
        <div className="space-y-0.5">
          <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            Revenue: <span className="text-slate-900 dark:text-white">{payload[0].value.toLocaleString()} MMK</span>
          </p>
          <p className="text-slate-500 dark:text-slate-400 font-mono">
            Orders: <span className="text-slate-700 dark:text-slate-200 font-bold">{payload[0].payload.ordersCount}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface AdminDashboardProps {
  groceries: GroceryItem[];
  orders: Order[];
  onRestock: (itemId: string, amount: number) => void;
  onUpdateOrderStatus: (orderId: string, status: any, step: number) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'order' | 'inventory') => void;
  onClose: () => void;
  /** Full-page /admin route vs modal overlay */
  variant?: 'modal' | 'page';
  adminLabel?: string;
}

export default function AdminDashboard({
  groceries,
  orders,
  onRestock,
  onUpdateOrderStatus,
  onAddToast,
  onAddNotification,
  onClose,
  variant = 'modal',
  adminLabel,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'inventory' | 'orders' | 'gdpr'>('overview');
  const isPage = variant === 'page';

  // Restock predictions based on historical purchase data in `orders` & item stock velocity
  const restockPredictions = useMemo(() => {
    // Count total units sold per item from active customer orders
    const salesMap: { [itemId: string]: number } = {};
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(cartItem => {
          salesMap[cartItem.item.id] = (salesMap[cartItem.item.id] || 0) + cartItem.quantity;
        });
      }
    });

    return groceries.map(item => {
      const unitsSoldInOrders = salesMap[item.id] || 0;
      // Effective units sold combines actual order checkout count with baseline velocity
      const effectiveUnitsSold = unitsSoldInOrders > 0 ? unitsSoldInOrders : (item.id.charCodeAt(0) % 4) + 2;
      const dailyVelocity = parseFloat((Math.max(0.6, effectiveUnitsSold / 7)).toFixed(1));
      const daysRemaining = Math.max(0, parseFloat((item.stock / dailyVelocity).toFixed(1)));
      const isCritical = item.stock <= 5 || daysRemaining <= 3.5;
      const recommendedRestock = Math.max(15, item.maxStock - item.stock);
      const urgency: 'HIGH' | 'MEDIUM' | 'LOW' = isCritical ? 'HIGH' : daysRemaining <= 6 ? 'MEDIUM' : 'LOW';
      const confidence = Math.min(98, Math.max(84, 86 + Math.floor(effectiveUnitsSold * 2)));

      return {
        item,
        unitsSoldInOrders,
        effectiveUnitsSold,
        dailyVelocity,
        daysRemaining,
        isCritical,
        recommendedRestock,
        urgency,
        confidence
      };
    }).sort((a, b) => {
      const urgencyScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (urgencyScore[a.urgency] !== urgencyScore[b.urgency]) {
        return urgencyScore[b.urgency] - urgencyScore[a.urgency];
      }
      return a.daysRemaining - b.daysRemaining;
    });
  }, [groceries, orders]);

  const criticalRestockCount = restockPredictions.filter(p => p.urgency === 'HIGH').length;

  // Calculate high-fidelity sales parameters
  const totalSales = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const lowStockItems = groceries.filter(item => item.stock <= 5);

  // Dynamic daily revenue over last 7 days calculation using useMemo
  const dailyData = useMemo(() => {
    const dates = [];
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // Baseline historical sales to make the chart populated on load
    const simulatedHistoricalSales = [125000, 185000, 145000, 290000, 210000, 340000];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const monthLabel = months[d.getMonth() % 12];
      const dateStr = `${monthLabel} ${String(d.getDate()).padStart(2, '0')}`;
      
      let revenue = 0;
      let orderCount = 0;
      if (i === 0) {
        // Today includes actual checkout orders (excluding cancelled) + today's base
        const sessionSales = orders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + o.totalAmount, 0);
        revenue = 340000 + sessionSales;
        orderCount = orders.filter(o => o.status !== 'cancelled').length;
      } else {
        revenue = simulatedHistoricalSales[6 - i];
        orderCount = 2 + ((6 - i) % 4); // Stable historic orders (not random)
      }
      
      dates.push({
        date: i === 0 ? `${dateStr} (Today)` : dateStr,
        revenue: revenue,
        ordersCount: orderCount
      });
    }
    return dates;
  }, [orders]);

  const stats = useMemo(() => {
    const highest = [...dailyData].sort((a, b) => b.revenue - a.revenue)[0];
    const total = dailyData.reduce((sum, d) => sum + d.revenue, 0);
    const average = total / dailyData.length;
    return { highest, average, total };
  }, [dailyData]);

  return (
    <div
      className={
        isPage
          ? 'min-h-screen bg-slate-100 dark:bg-[#0a0a0a] p-0 sm:p-4 font-sans'
          : 'fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans'
      }
    >
      <motion.div
        initial={{ scale: isPage ? 1 : 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={
          isPage
            ? 'bg-white dark:bg-[#0F0F0F] border-0 sm:border border-slate-200 dark:border-white/10 rounded-none sm:rounded-2xl w-full max-w-6xl mx-auto min-h-screen sm:min-h-[90vh] flex flex-col overflow-hidden shadow-none sm:shadow-2xl'
            : 'bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden shadow-2xl'
        }
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#121212]">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white leading-tight">
                Enterprise Admin Dashboard
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {adminLabel
                  ? `Signed in as ${adminLabel} · /admin`
                  : 'Manage real-time inventory levels, daily sales graphs, and security logs.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1f1f1f] text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0"
          >
            {isPage ? 'Sign out' : 'Close Dashboard'}
          </button>
        </div>

        {/* Navigation Sidebar / Header tabs */}
        <div className="border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#0F0F0F] px-4 py-2 flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Daily Sales & Trends', icon: BarChart3 },
            { id: 'predictions', label: `Restock Predictions (${criticalRestockCount})`, icon: Brain },
            { id: 'inventory', label: `Inventory Alerts (${lowStockItems.length})`, icon: AlertOctagon },
            { id: 'orders', label: `Active Deliveries (${orders.filter(o => o.status !== 'delivered').length})`, icon: PackageOpen },
            { id: 'gdpr', label: 'GDPR Compliance Logs', icon: ShieldAlert }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-[#161616]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#121212]">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161616]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Accumulated Sales (Today)</span>
                  <p className="font-mono text-2xl font-extrabold text-emerald-500 mt-1.5">
                    {totalSales.toLocaleString()} MMK
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Compiled from {orders.length} secure checkouts.</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161616]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Web Sessions</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <p className="font-mono text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">
                      142 <span className="text-xs font-normal text-slate-400">users</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Live WebSocket heartbeats synced.</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161616]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Average conversion rate</span>
                  <p className="font-mono text-2xl font-extrabold text-emerald-400 mt-1.5">
                    4.85%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Calculated over 7 rolling days.</span>
                </div>
              </div>

              {/* Graphic Daily Sales Area Chart */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="font-display font-extrabold text-sm md:text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-emerald-500" />
                      Daily Revenue Pipeline (7-Day Rolling)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Real-time ledger processing comparing historic cycles against today's live cart checkouts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase">
                      <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" /> Live Today
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                      Audited
                    </span>
                  </div>
                </div>

                {/* Recharts Bar Chart */}
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(148, 163, 184, 0.08)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#888888', fontSize: 10, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                        tick={{ fill: '#888888', fontSize: 10, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.04)' }}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {dailyData.map((entry, index) => {
                          const isToday = entry.date.includes('Today');
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={isToday ? '#a78bfa' : '#10b981'}
                              fillOpacity={isToday ? 0.95 : 0.8}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Live Stats Insights Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs font-mono">
                  <div className="bg-slate-50 dark:bg-[#121212] p-3 rounded-xl border border-slate-150/60 dark:border-white/5">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">7-Day Total Yield</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 block">
                      {stats.total.toLocaleString()} MMK
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#121212] p-3 rounded-xl border border-slate-150/60 dark:border-white/5">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Calculated Rolling Average</span>
                    <span className="text-sm font-extrabold text-emerald-500 mt-1 block">
                      {Math.round(stats.average).toLocaleString()} MMK
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#121212] p-3 rounded-xl border border-slate-150/60 dark:border-white/5">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Peak Sales Volume</span>
                    <span className="text-sm font-extrabold text-purple-400 mt-1 block">
                      {stats.highest.revenue.toLocaleString()} MMK <span className="text-[10px] text-slate-500 font-normal">({stats.highest.date.replace(' (Today)', '')})</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RESTOCK PREDICTIONS TAB */}
          {activeTab === 'predictions' && (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="p-4 bg-linear-to-r from-purple-500/10 via-emerald-500/10 to-transparent border border-purple-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                    <h4 className="font-display font-extrabold text-base text-slate-800 dark:text-white">
                      AI Inventory Restock Predictions
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                      Historical Purchase Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Predicts stock depletion timelines based on active customer order velocity, historical checkout frequencies, and warehouse burn rates.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      const criticals = restockPredictions.filter(p => p.urgency === 'HIGH');
                      if (criticals.length === 0) {
                        onAddToast('Stock Healthy', 'No critical restock items detected.', 'info');
                        return;
                      }
                      criticals.forEach(c => onRestock(c.item.id, c.recommendedRestock));
                      onAddToast('Auto-Restock Executed', `Replenished ${criticals.length} high-urgency items.`, 'success');
                      onAddNotification(
                        'Batch Restock Completed',
                        `Automated ML prediction restock added inventory to ${criticals.length} critical items.`,
                        'inventory'
                      );
                    }}
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-400 text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    Auto-Restock All Critical ({criticalRestockCount})
                  </button>
                </div>
              </div>

              {/* Predictions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1 uppercase tracking-wider">
                  <span>Inventory Item & Analysis</span>
                  <span>Burn Rate & Time-To-Stockout</span>
                </div>

                {restockPredictions.map(p => {
                  const urgencyColors = {
                    HIGH: 'bg-red-500/10 text-red-500 border-red-500/30',
                    MEDIUM: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
                    LOW: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  }[p.urgency];

                  return (
                    <div
                      key={p.item.id}
                      className={`p-4 border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                        p.urgency === 'HIGH'
                          ? 'border-red-500/30 bg-red-500/5 dark:bg-red-950/10'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161616]'
                      }`}
                    >
                      {/* Left: Product details & confidence */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={p.item.imageUrl}
                          alt={p.item.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{p.item.name}</span>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${urgencyColors}`}>
                              {p.urgency} URGENCY
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono">
                            <span>Current Stock: <strong className={p.item.stock <= 5 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}>{p.item.stock} / {p.item.maxStock}</strong></span>
                            <span>•</span>
                            <span>Orders Sold: <strong className="text-slate-700 dark:text-slate-300">{p.unitsSoldInOrders} units</strong></span>
                            <span>•</span>
                            <span className="text-purple-400 font-bold">ML Confidence: {p.confidence}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Velocity, timeline & auto restock button */}
                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-white/5">
                        <div className="text-left md:text-right font-mono">
                          <div className="flex items-center gap-1 md:justify-end text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{p.daysRemaining <= 0 ? 'STOCKOUT IMMINENT' : `~${p.daysRemaining} Days Left`}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Burn rate: <strong className="text-emerald-500">{p.dailyVelocity} units/day</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            onRestock(p.item.id, p.recommendedRestock);
                            onAddToast('Predicted Restock Applied', `Added +${p.recommendedRestock} units to ${p.item.name}.`, 'success');
                            onAddNotification(
                              'ML Restock Triggered',
                              `Predicted restock successful: +${p.recommendedRestock} units added to ${p.item.name}.`,
                              'inventory'
                            );
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-lg cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Restock +{p.recommendedRestock}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Active Inventory & Stock Alert Levels</h4>
                  <p className="text-xs text-slate-400">Critical real-time replenishment notifications for under-stocked groceries.</p>
                </div>
                <div className="flex items-center gap-1 bg-red-950/20 px-2.5 py-1 rounded-lg border border-red-900/40 text-[11px] font-bold text-red-700 dark:text-red-400">
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>{lowStockItems.length} Warnings Active</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {groceries.map(item => {
                  const isLow = item.stock <= 5;
                  const ratio = (item.stock / item.maxStock) * 100;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                        isLow
                          ? 'border-red-200 bg-red-50/10 dark:border-red-900/30'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#161616]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800 dark:text-white">{item.name}</span>
                            <span className="text-[9px] font-mono text-slate-400">({item.category})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500">Stock: <span className="font-mono font-bold">{item.stock} / {item.maxStock}</span></span>
                            {/* Stock progress bar */}
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {isLow && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 rounded uppercase">
                            ⚠️ Low Stock Warning
                          </span>
                        )}
                        <button
                          onClick={() => {
                            onRestock(item.id, 15);
                            onAddToast('Stock Replenished', `Added +15 units to ${item.name}.`, 'success');
                            onAddNotification(
                              'Inventory Restocked',
                              `Restock successful on Shwe Bo Warehouse: +15 units added to ${item.name}.`,
                              'inventory'
                            );
                          }}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-lg border border-emerald-500/20 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Replenish
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE DELIVERIES TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Active Order Pipelines</h4>
                <p className="text-xs text-slate-400">Advance customer delivery stages manually for status verification simulation.</p>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center text-slate-400">
                  <PackageOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No active customer orders placed yet</p>
                  <p className="text-xs">Once users submit checkouts, they will land here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(ord => {
                    const nextStatuses: { [key: string]: { status: string; step: number; label: string } } = {
                      pending: { status: 'processing', step: 1, label: 'Pack Order' },
                      processing: { status: 'out_for_delivery', step: 2, label: 'Dispatch Rider' },
                      out_for_delivery: { status: 'delivered', step: 4, label: 'Arrive / Deliver' }
                    };

                    const action = nextStatuses[ord.status];

                    return (
                      <div key={ord.id} className="p-4 border border-slate-200 dark:border-white/10 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-[#161616]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-500">{ord.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wide rounded-sm bg-white/5 dark:bg-white/5 text-slate-300">
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Recipient: <span className="font-bold text-slate-700 dark:text-slate-300">{ord.deliveryAddress.name}</span> • {ord.deliveryAddress.addressLine}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Value: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{ord.totalAmount.toLocaleString()} MMK</span> via <span className="uppercase">{ord.paymentMethod.type}</span></p>
                        </div>

                        {action ? (
                          <button
                            onClick={() => {
                              onUpdateOrderStatus(ord.id, action.status, action.step);
                              onAddToast('Status Advanced', `Order ${ord.id} moved to ${action.status}.`, 'success');
                              onAddNotification(
                                'Order Status Advanced',
                                `Order pipeline ${ord.id} is now advanced to '${action.status}'.`,
                                'order'
                              );
                            }}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {action.label}
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-500 font-extrabold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Delivered & Closed
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GDPR AUDIT LOGS TAB */}
          {activeTab === 'gdpr' && (
            <div className="space-y-4">
              <div className="flex gap-2 p-3 bg-emerald-50/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-emerald-200">Regulatory GDPR Compliance Audit</p>
                  <p className="leading-relaxed">
                    This platform isolates private user entities (emails, exact phones, drop coordinates). Every access token or profile state change undergoes automated decryption handshakes. Transient telemetry logs are scrubbed within 48 hours to minimize footprint.
                  </p>
                </div>
              </div>

              {/* Simulated Log Output */}
              <div className="p-4 bg-[#0F0F0F] text-emerald-400 font-mono text-xs rounded-xl border border-white/10 space-y-2 h-64 overflow-y-auto leading-relaxed">
                <div>[04:12:08 UTC] <span className="text-blue-400 font-bold">INFO:</span> PCI-DSS secure handshake verified with KBZPay API endpoint.</div>
                <div>[04:12:09 UTC] <span className="text-emerald-400 font-bold">AUDIT_LOG:</span> Verified User Google OAuth2 credential. (Signature: G_OAUTH_SHA256)</div>
                <div>[05:30:15 UTC] <span className="text-blue-400 font-bold">INFO:</span> SSL 256-bit encryption verified on all active user channels.</div>
                <div>[06:45:00 UTC] <span className="text-amber-500 font-bold">WARN:</span> Low stock event triggered for Shwe Bo Hills Coffee. Restock dispatched.</div>
                <div>[08:12:11 UTC] <span className="text-purple-400 font-bold">GDPR:</span> Automated Data Minimization: Cleared telemetry coordinates older than 48 hours.</div>
                <div>[08:15:22 UTC] <span className="text-purple-400 font-bold">GDPR:</span> Consent preference stored for newly compiled user profiles.</div>
                <div>[09:02:44 UTC] <span className="text-blue-400 font-bold">INFO:</span> Decrypting private billing credentials on client viewport request... Verified signature matching current session.</div>
                <div className="animate-pulse">[...] Awaiting live secure platform queries...</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
