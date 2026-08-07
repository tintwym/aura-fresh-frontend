import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceSparklineProps {
  itemId: string;
  basePrice: number;
}

export default function PriceSparkline({ itemId, basePrice }: PriceSparklineProps) {
  const data = useMemo(() => {
    const points = [];
    // Deterministic random generator based on itemId string hash
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);

    for (let i = 29; i >= 0; i--) {
      // Create a smooth pseudo-random walk
      const x = 29 - i;
      const trend = Math.sin((x + seed) * 0.15) * 0.05; // up to 5% variation
      const wave = Math.cos((x * 0.3) + (seed % 7)) * 0.02;
      const priceVal = Math.round(basePrice * (1 + trend + wave));
      
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      points.push({
        day: dayLabel,
        price: priceVal,
      });
    }
    return points;
  }, [itemId, basePrice]);

  const stats = useMemo(() => {
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const start = data[0].price;
    const end = data[data.length - 1].price;
    const percentChange = ((end - start) / start) * 100;
    return { min, max, percentChange };
  }, [data]);

  return (
    <div className="mt-2.5 p-3 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          {stats.percentChange >= 0 ? (
            <span className="flex items-center text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" /> +{stats.percentChange.toFixed(1)}%
            </span>
          ) : (
            <span className="flex items-center text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-md">
              <TrendingDown className="w-3 h-3 mr-0.5 shrink-0" /> {stats.percentChange.toFixed(1)}%
            </span>
          )}
          <span className="text-slate-400 font-medium">30d Price history</span>
        </div>
        <div className="text-right font-mono text-[9px] text-slate-500 dark:text-slate-400">
          {stats.min.toLocaleString()} - {stats.max.toLocaleString()} MMK
        </div>
      </div>

      <div className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`colorPrice-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stats.percentChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={stats.percentChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white text-[10px] p-1.5 rounded-lg border border-slate-800 shadow-xl font-mono">
                      <p className="font-sans font-semibold text-[9px] text-slate-400">{item.day}</p>
                      <p className="font-bold mt-0.5 text-emerald-400">{item.price.toLocaleString()} MMK</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={stats.percentChange >= 0 ? "#10b981" : "#ef4444"}
              strokeWidth={1.5}
              fillOpacity={1}
              fill={`url(#colorPrice-${itemId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
