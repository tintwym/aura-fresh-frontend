import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin, Navigation, Compass, AlertTriangle, MessageSquare, Phone, Map, ShieldCheck, Play, FastForward, CheckCircle2, X, Flame, Zap, Layers, RefreshCw, Activity
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';

interface OrderTrackerProps {
  order: Order;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, step: number) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'order' | 'inventory') => void;
  onClose: () => void;
}

// Yangon Neighborhood Hotspot data model
interface NeighborhoodHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  avgMins: number;
  activeRiders: number;
  trafficStatus: 'optimal' | 'moderate' | 'dense';
  orderVolume: number;
}

export default function OrderTracker({
  order,
  onUpdateOrderStatus,
  onAddToast,
  onAddNotification,
  onClose
}: OrderTrackerProps) {
  // Map mode switch: 'route' or 'hotspots'
  const [mapMode, setMapMode] = useState<'route' | 'hotspots'>('route');

  // Map simulation parameters
  const [zoom, setZoom] = useState(14);
  const [riderProgress, setRiderProgress] = useState(0); // 0 to 100 percentage
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 2x, 5x
  const [eta, setEta] = useState(18); // minutes remaining

  // Selected neighborhood for D3 inspection
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<NeighborhoodHotspot | null>(null);

  // Yangon Neighborhood Hotspots Dataset
  const [hotspots, setHotspots] = useState<NeighborhoodHotspot[]>([
    { id: 'bahan', name: 'Bahan (Depot Hub)', lat: 16.808, lng: 96.155, avgMins: 8, activeRiders: 18, trafficStatus: 'optimal', orderVolume: 142 },
    { id: 'yankin', name: 'Yankin Township', lat: 16.829, lng: 96.173, avgMins: 12, activeRiders: 14, trafficStatus: 'optimal', orderVolume: 98 },
    { id: 'kamayut', name: 'Kamayut Township', lat: 16.821, lng: 96.132, avgMins: 14, activeRiders: 11, trafficStatus: 'moderate', orderVolume: 85 },
    { id: 'dagon', name: 'Dagon / Golden Valley', lat: 16.798, lng: 96.148, avgMins: 10, activeRiders: 15, trafficStatus: 'optimal', orderVolume: 110 },
    { id: 'sanchaung', name: 'Sanchaung Township', lat: 16.802, lng: 96.136, avgMins: 15, activeRiders: 12, trafficStatus: 'moderate', orderVolume: 92 },
    { id: 'downtown', name: 'Downtown (Kyauktada)', lat: 16.778, lng: 96.160, avgMins: 19, activeRiders: 9, trafficStatus: 'dense', orderVolume: 165 },
    { id: 'hlaing', name: 'Hlaing Township', lat: 16.837, lng: 96.126, avgMins: 22, activeRiders: 8, trafficStatus: 'moderate', orderVolume: 74 },
    { id: 'mayangone', name: 'Mayangone Township', lat: 16.852, lng: 96.145, avgMins: 25, activeRiders: 6, trafficStatus: 'dense', orderVolume: 60 }
  ]);

  const d3SvgRef = useRef<SVGSVGElement | null>(null);

  // D3 Rendering Logic for Delivery Hotspots Map
  useEffect(() => {
    if (mapMode !== 'hotspots' || !d3SvgRef.current) return;

    const svg = d3.select(d3SvgRef.current);
    svg.selectAll('*').remove(); // Reset D3 layer

    const width = 300;
    const height = 300;

    // Projection math for Yangon coordinates (lat ~16.76 - 16.86, lng ~96.11 - 96.19)
    const minLat = 16.76;
    const maxLat = 16.87;
    const minLng = 96.11;
    const maxLng = 96.19;

    const projectPoint = (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * 260 + 20;
      const y = 300 - (((lat - minLat) / (maxLat - minLat)) * 260 + 20);
      return { x, y };
    };

    // Color interpolation using D3 scaleLinear
    const speedColorScale = d3.scaleLinear<string>()
      .domain([8, 15, 26])
      .range(['#10b981', '#f59e0b', '#ef4444']);

    // Background Grid
    const defs = svg.append('defs');

    // Create radial gradients for each neighborhood
    hotspots.forEach(h => {
      const gradId = `grad-${h.id}`;
      const radialGrad = defs.append('radialGradient')
        .attr('id', gradId)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      radialGrad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', speedColorScale(h.avgMins))
        .attr('stop-opacity', '0.6');

      radialGrad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', speedColorScale(h.avgMins))
        .attr('stop-opacity', '0.0');
    });

    // Pattern background
    const pattern = defs.append('pattern')
      .attr('id', 'd3-grid')
      .attr('width', '30')
      .attr('height', '30')
      .attr('patternUnits', 'userSpaceOnUse');

    pattern.append('path')
      .attr('d', 'M 30 0 L 0 0 0 30')
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', '0.5')
      .attr('stroke-opacity', '0.15');

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#d3-grid)')
      .attr('rx', 8);

    // Connecting street lines between nodes
    const bahanPt = projectPoint(16.808, 96.155);
    hotspots.forEach(h => {
      if (h.id === 'bahan') return;
      const pt = projectPoint(h.lat, h.lng);
      svg.append('line')
        .attr('x1', bahanPt.x)
        .attr('y1', bahanPt.y)
        .attr('x2', pt.x)
        .attr('y2', pt.y)
        .attr('stroke', speedColorScale(h.avgMins))
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0.4);
    });

    // Render D3 Heatspot Circles and Pulsing Rings
    hotspots.forEach(h => {
      const pt = projectPoint(h.lat, h.lng);
      const isSelected = selectedNeighborhood?.id === h.id;

      // Outer heat aura
      svg.append('circle')
        .attr('cx', pt.x)
        .attr('cy', pt.y)
        .attr('r', Math.max(16, 35 - h.avgMins))
        .attr('fill', `url(#grad-${h.id})`);

      // Pulsing halo ring using D3 transitions
      const ring = svg.append('circle')
        .attr('cx', pt.x)
        .attr('cy', pt.y)
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', speedColorScale(h.avgMins))
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.8);

      ring.transition()
        .duration(1800)
        .ease(d3.easeCircleOut)
        .attr('r', 22)
        .attr('stroke-opacity', 0)
        .on('end', function repeat() {
          d3.select(this)
            .attr('r', 8)
            .attr('stroke-opacity', 0.8)
            .transition()
            .duration(1800)
            .ease(d3.easeCircleOut)
            .attr('r', 22)
            .attr('stroke-opacity', 0)
            .on('end', repeat);
        });

      // Node point
      svg.append('circle')
        .attr('cx', pt.x)
        .attr('cy', pt.y)
        .attr('r', isSelected ? 6 : 4.5)
        .attr('fill', speedColorScale(h.avgMins))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', isSelected ? 2 : 1)
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedNeighborhood(h);
        });

      // Label badge
      const labelGroup = svg.append('g')
        .attr('transform', `translate(${pt.x}, ${pt.y - 12})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedNeighborhood(h);
        });

      labelGroup.append('rect')
        .attr('x', -24)
        .attr('y', -7)
        .attr('width', 48)
        .attr('height', 11)
        .attr('rx', 3)
        .attr('fill', '#0F0F0F')
        .attr('fill-opacity', '0.85')
        .attr('stroke', speedColorScale(h.avgMins))
        .attr('stroke-width', 0.8);

      labelGroup.append('text')
        .attr('x', 0)
        .attr('y', 1)
        .attr('text-anchor', 'middle')
        .attr('font-size', '6.5px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .text(`${h.avgMins}m ETA`);
    });

  }, [mapMode, hotspots, selectedNeighborhood]);

  // Periodic subtle updates to simulate live real-time traffic flux
  useEffect(() => {
    const interval = setInterval(() => {
      setHotspots(prev =>
        prev.map(h => {
          const delta = (Math.random() - 0.5) * 1.5;
          const newAvg = Math.max(6, Math.min(30, Math.round((h.avgMins + delta) * 10) / 10));
          return {
            ...h,
            avgMins: newAvg
          };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Rider position coordinates
  const warehouse = { lat: 16.812, lng: 96.151 }; // Bahan Depot
  const destination = { lat: order.deliveryLat, lng: order.deliveryLng };

  // Calculate current rider position along straight path
  const currentRiderLat = warehouse.lat + (destination.lat - warehouse.lat) * (riderProgress / 100);
  const currentRiderLng = warehouse.lng + (destination.lng - warehouse.lng) * (riderProgress / 100);

  // SVG coordinate projection
  const minLat = Math.min(warehouse.lat, destination.lat) - 0.015;
  const maxLat = Math.max(warehouse.lat, destination.lat) + 0.015;
  const minLng = Math.min(warehouse.lng, destination.lng) - 0.015;
  const maxLng = Math.max(warehouse.lng, destination.lng) + 0.015;

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 260 + 20;
    const y = 300 - (((lat - minLat) / (maxLat - minLat)) * 260 + 20);
    return { x, y };
  };

  const ptStart = project(warehouse.lat, warehouse.lng);
  const ptEnd = project(destination.lat, destination.lng);
  const ptRider = project(currentRiderLat, currentRiderLng);

  // Automated step status simulation effect
  useEffect(() => {
    let intervalId: any;

    if (order.status !== 'delivered' && order.status !== 'cancelled') {
      intervalId = setInterval(() => {
        if (order.status === 'out_for_delivery') {
          setRiderProgress(prev => {
            const next = prev + 2 * simulationSpeed;
            if (next >= 100) {
              onUpdateOrderStatus(order.id, 'delivered', 4);
              onAddToast('Order Delivered! 🎉', 'Your rider has arrived with your groceries.', 'success');
              onAddNotification(
                'Groceries Delivered!',
                `Your rider has dropped off order ${order.id} at your chosen address. Enjoy fresh premium groceries!`,
                'success'
              );
              setEta(0);
              return 100;
            }
            setEta(Math.max(1, Math.ceil(15 * (1 - next / 100))));
            return next;
          });
        } else if (order.status === 'pending') {
          onUpdateOrderStatus(order.id, 'processing', 1);
          onAddToast('Order Processing', 'Bahan Grocery Depot has accepted and is packing your items.', 'info');
          onAddNotification(
            'Invoicing approved',
            `Order ${order.id} is now being packed by our local handlers.`,
            'order'
          );
        } else if (order.status === 'processing') {
          onUpdateOrderStatus(order.id, 'out_for_delivery', 2);
          onAddToast('Out for Delivery 🛵', 'Your Rider has picked up your groceries and is en-route.', 'success');
          onAddNotification(
            'Rider Dispatched',
            `Order ${order.id} has left Bahan Depot. Track progress live on the map!`,
            'order'
          );
        }
      }, 5000 / simulationSpeed);
    }

    return () => clearInterval(intervalId);
  }, [order.status, simulationSpeed, order.id]);

  // Sort hotspots by speed
  const sortedHotspots = [...hotspots].sort((a, b) => a.avgMins - b.avgMins);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col md:flex-row overflow-hidden shadow-2xl"
      >
        {/* Map visualization area */}
        <div className="flex-1 bg-slate-50 dark:bg-[#0F0F0F] relative flex flex-col min-h-[300px] md:min-h-0 border-r border-slate-100 dark:border-white/10">
          
          {/* Mobile floating close button */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-3 left-3 z-30 p-2 rounded-full bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xs text-slate-600 dark:text-slate-300 shadow-md border border-slate-200/60 dark:border-white/10 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            aria-label="Close tracking modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* View mode toggle bar at top right */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex bg-white/90 dark:bg-[#121212]/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200/60 dark:border-white/10 gap-1 text-[10px] sm:text-[11px] font-bold">
            <button
              onClick={() => setMapMode('route')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                mapMode === 'route'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Live GPS Route</span>
            </button>
            <button
              onClick={() => setMapMode('hotspots')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                mapMode === 'hotspots'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Hotspots (D3)</span>
            </button>
          </div>

          {/* Map Header details */}
          <div className="absolute top-14 left-3 sm:top-4 sm:left-4 z-10 bg-white/90 dark:bg-[#121212]/95 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl shadow-md border border-slate-200/60 dark:border-white/10 text-xs flex flex-col gap-0.5 sm:gap-1 max-w-[190px] sm:max-w-xs">
            {mapMode === 'route' ? (
              <>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white truncate">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                  <span className="truncate">Bahan Depot → {order.deliveryAddress.name}</span>
                </div>
                <p className="text-[10px] text-slate-500">Live Rider GPS: <span className="font-mono text-emerald-500 dark:text-emerald-400 font-bold">{currentRiderLat.toFixed(4)}, {currentRiderLng.toFixed(4)}</span></p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse shrink-0" />
                  <span>Yangon Real-time Speed Heatmap</span>
                </div>
                <p className="text-[10px] text-slate-500">D3-rendered delivery velocity clusters across active Yangon zones.</p>
              </>
            )}
          </div>

          {/* Controls bar at bottom left */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
            {mapMode === 'route' ? (
              <div className="bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xs p-1 rounded-lg shadow-md border border-slate-200/50 dark:border-white/10 flex gap-1 text-[10px] font-bold">
                {[
                  { speed: 1, label: '1x' },
                  { speed: 2, label: '2x' },
                  { speed: 5, label: '5x' }
                ].map(s => (
                  <button
                    key={s.speed}
                    onClick={() => setSimulationSpeed(s.speed)}
                    className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${simulationSpeed === s.speed ? 'bg-emerald-500 text-black font-extrabold' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xs p-2 rounded-xl shadow-md border border-slate-200/50 dark:border-white/10 flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1 font-bold text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;12m (Fast)</span>
                <span className="flex items-center gap-1 font-bold text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500" /> 12-20m</span>
                <span className="flex items-center gap-1 font-bold text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;20m</span>
              </div>
            )}
          </div>

          {/* Map canvas */}
          <div className="flex-1 flex items-center justify-center p-4">
            {mapMode === 'route' ? (
              <svg
                viewBox="0 0 300 300"
                className="w-full h-full max-h-[360px] md:max-h-[480px] text-slate-300 dark:text-[#222] transition-all duration-300"
                style={{ transform: `scale(${1 + (zoom - 14) * 0.1})` }}
              >
                <defs>
                  <pattern id="street-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
                  </pattern>
                </defs>
                <rect width="300" height="300" fill="url(#street-grid)" rx="8" />

                <path d="M 0 150 Q 150 180 300 150" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M 120 0 Q 150 150 180 300" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />

                <text x="10" y="145" fontSize="6" fill="#888" fontWeight="bold" opacity="0.5">Kabaye Pagoda Road</text>
                <text x="135" y="30" fontSize="6" fill="#888" fontWeight="bold" opacity="0.5" transform="rotate(75 135 30)">Pyay Road</text>

                <line
                  x1={ptStart.x}
                  y1={ptStart.y}
                  x2={ptEnd.x}
                  y2={ptEnd.y}
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />

                <circle cx={ptStart.x} cy={ptStart.y} r="8" fill="#10b981" fillOpacity="0.2" />
                <circle cx={ptStart.x} cy={ptStart.y} r="4" fill="#10b981" />
                <text x={ptStart.x + 8} y={ptStart.y + 2} fontSize="7" fill="#10b981" fontWeight="black" className="dark:fill-emerald-400">
                  DEPOT (Bahan)
                </text>

                <circle cx={ptEnd.x} cy={ptEnd.y} r="10" fill="#ec4899" fillOpacity="0.2" className="animate-ping" />
                <circle cx={ptEnd.x} cy={ptEnd.y} r="4" fill="#ec4899" />
                <text x={ptEnd.x + 8} y={ptEnd.y + 2} fontSize="7" fill="#ec4899" fontWeight="black">
                  {order.deliveryAddress.name.toUpperCase()}
                </text>

                {order.status === 'out_for_delivery' && (
                  <g transform={`translate(${ptRider.x - 6}, ${ptRider.y - 6})`}>
                    <circle cx="6" cy="6" r="6" fill="#10b981" />
                    <polygon points="4,4 9,6 4,8" fill="white" transform="rotate(35 6 6)" />
                  </g>
                )}
              </svg>
            ) : (
              /* D3 Delivery Hotspots SVG Canvas */
              <svg
                ref={d3SvgRef}
                viewBox="0 0 300 300"
                className="w-full h-full max-h-[360px] md:max-h-[480px] text-slate-300 dark:text-[#222]"
              />
            )}
          </div>

          <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-[#121212]/80 px-2.5 py-1 rounded text-[9px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-white/10">
            {mapMode === 'route' ? 'Interactive GIS Mock • 1cm = 200m' : 'D3 Visualization Engine Active'}
          </div>
        </div>

        {/* Sidebar Status & details panel */}
        <div className="w-full md:w-[360px] p-6 flex flex-col justify-between shrink-0 bg-white dark:bg-[#121212] overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 font-mono tracking-widest uppercase">
                  Order ID: {order.id}
                </span>
                <h4 className="font-display font-bold text-lg text-slate-800 dark:text-white leading-tight">
                  {mapMode === 'route' ? 'Delivery Tracking' : 'Speed Hotspots Panel'}
                </h4>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f1f1f] text-slate-400 dark:hover:text-white cursor-pointer"
                aria-label="Close tracking modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If in Hotspots view mode, display speed leaderboards and neighborhood card */}
            {mapMode === 'hotspots' ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <Zap className="w-4 h-4" />
                    <span>Fastest Delivery Neighborhoods</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Calculated in real-time from active rider speed vectors & order dispatch density.
                  </p>
                </div>

                {/* Selected Neighborhood inspector or Leaderboard */}
                {selectedNeighborhood ? (
                  <div className="p-4 bg-slate-50 dark:bg-[#161616] border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-emerald-500 uppercase font-bold">Selected Neighborhood</span>
                        <h5 className="font-bold text-sm text-slate-800 dark:text-white">{selectedNeighborhood.name}</h5>
                      </div>
                      <button
                        onClick={() => setSelectedNeighborhood(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
                      >
                        Reset Selection
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-white dark:bg-[#0F0F0F] p-2 rounded-lg border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] text-slate-400 block uppercase">Avg Delivery</span>
                        <span className="font-extrabold text-emerald-500 text-sm">{selectedNeighborhood.avgMins} mins</span>
                      </div>
                      <div className="bg-white dark:bg-[#0F0F0F] p-2 rounded-lg border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] text-slate-400 block uppercase">Active Riders</span>
                        <span className="font-extrabold text-slate-800 dark:text-white text-sm">{selectedNeighborhood.activeRiders} 🛵</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Traffic Flow: <span className="font-bold uppercase text-emerald-400">{selectedNeighborhood.trafficStatus}</span> • Volume: {selectedNeighborhood.orderVolume} orders/hr
                    </p>
                  </div>
                ) : null}

                {/* Hotspot Rankings List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Speed Rankings</span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {sortedHotspots.map((h, idx) => (
                      <div
                        key={h.id}
                        onClick={() => setSelectedNeighborhood(h)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          selectedNeighborhood?.id === h.id
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold'
                            : 'bg-slate-50 dark:bg-[#161616] border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-bold w-4 text-slate-400">#{idx + 1}</span>
                          <span className="truncate text-xs font-semibold">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            h.avgMins <= 12
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : h.avgMins <= 18
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            ⚡ {h.avgMins}m ETA
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Route View Mode ETA & Timeline */
              <>
                {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                  <div className="p-4 rounded-xl bg-emerald-55/5 dark:bg-[#161616] border border-emerald-500/10 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Estimated arrival</span>
                      <p className="font-display font-extrabold text-3xl text-emerald-500 dark:text-emerald-400 mt-1">
                        {eta} <span className="text-sm font-sans font-normal text-slate-500">mins</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Speed</span>
                      <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        ⚡ {simulationSpeed}x Sim
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <h5 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">Delivery Completed</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your groceries have been successfully drop-posted.</p>
                  </div>
                )}

                {/* Timeline stages */}
                <div className="space-y-4 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Delivery Status Timeline</span>
                  <div className="relative pl-6 space-y-5">
                    <div className="absolute top-2 left-2.5 bottom-2 w-0.5 bg-slate-100 dark:bg-white/10" />

                    {[
                      { id: 'pending', label: 'Order Registered', desc: 'Secure payment cleared. Preparing cart items.' },
                      { id: 'processing', label: 'Depot Packing', desc: 'Sourcing organic goods from regional farms.' },
                      { id: 'out_for_delivery', label: 'En-route Rider', desc: 'Rider dispatched with active GPS monitoring.' },
                      { id: 'delivered', label: 'Dispatched & Arrived', desc: 'Groceries deposited securely at coordinates.' }
                    ].map((stg, idx) => {
                      const currentIdx = ['pending', 'processing', 'out_for_delivery', 'delivered'].indexOf(order.status);
                      const isPast = idx < currentIdx;
                      const isActive = idx === currentIdx;

                      return (
                        <div key={stg.id} className="relative text-xs">
                          <span className={`absolute -left-6 top-0.5 w-3 h-3 rounded-full border-2 transition-all ${
                            isActive ? 'bg-emerald-500 border-emerald-500 scale-125' : isPast ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-[#121212] border-slate-300 dark:border-white/10'
                          }`} />
                          <h5 className={`font-semibold ${isActive ? 'text-emerald-500 dark:text-emerald-400 font-bold' : isPast ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                            {stg.label}
                          </h5>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{stg.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Rider profile card */}
          <div className="border-t border-slate-100 dark:border-white/10 pt-4 mt-6">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                alt="Rider avatar"
                className="w-10 h-10 rounded-full border border-slate-200 object-cover"
              />
              <div className="flex-1 text-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Assigned Rider</span>
                <h5 className="font-bold text-slate-800 dark:text-white leading-tight">Ko Min Aung</h5>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Honda Wave 125S (YGN 5I-8822)</p>
              </div>
              <div className="flex gap-1">
                <a
                  href="tel:09978123456"
                  className="p-1.5 rounded-lg border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0F0F0F] text-slate-600 dark:text-slate-300 hover:text-emerald-400 transition-colors"
                  aria-label="Call rider"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <button
                  onClick={() => onAddToast('Chat Connected', 'Encrypted messaging tunnel opened with Ko Min Aung.', 'success')}
                  className="p-1.5 rounded-lg border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0F0F0F] text-slate-600 dark:text-slate-300 hover:text-emerald-400 transition-colors"
                  aria-label="Message rider"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
