import type { DietaryRestriction } from '../types';
import {
  DELIVERY_ZONES,
  FREE_DELIVERY_OVER_MMK,
  deliveryEtaFor,
  deliveryFeeFor,
} from '../lib/deliveryZones';

/** Filter chip options — not product data. */
export const DIETARY_OPTIONS: { name: string; value: DietaryRestriction | string }[] = [
  { name: 'Vegan', value: 'Vegan' },
  { name: 'Vegetarian', value: 'Vegetarian' },
  { name: 'Gluten-Free', value: 'Gluten-Free' },
  { name: 'Non-GMO', value: 'Non-GMO' },
  { name: 'Dairy-Free', value: 'Dairy-Free' },
  { name: 'Halal', value: 'Halal' },
  { name: 'Organic', value: 'Organic' },
];

export const ZONE_OPTIONS = ['All Zones', ...DELIVERY_ZONES];

export interface ZoneDeliveryInfo {
  zone: string;
  title: string;
  description: string;
  feeMmk: number;
  eta: string;
}

export const ZONE_DELIVERY_STATUS: Record<string, ZoneDeliveryInfo> = {
  'Downtown Yangon': {
    zone: 'Downtown Yangon',
    title: 'Downtown Yangon',
    description: `Delivery ${deliveryFeeFor('Downtown Yangon', 0).toLocaleString()} MMK · ${deliveryEtaFor('Downtown Yangon')} (free over ${FREE_DELIVERY_OVER_MMK.toLocaleString()} MMK)`,
    feeMmk: deliveryFeeFor('Downtown Yangon', 0),
    eta: deliveryEtaFor('Downtown Yangon'),
  },
  Yankin: {
    zone: 'Yankin',
    title: 'Yankin',
    description: `Delivery ${deliveryFeeFor('Yankin', 0).toLocaleString()} MMK · ${deliveryEtaFor('Yankin')} (free over ${FREE_DELIVERY_OVER_MMK.toLocaleString()} MMK)`,
    feeMmk: deliveryFeeFor('Yankin', 0),
    eta: deliveryEtaFor('Yankin'),
  },
  Bahan: {
    zone: 'Bahan',
    title: 'Bahan',
    description: `Delivery ${deliveryFeeFor('Bahan', 0).toLocaleString()} MMK · ${deliveryEtaFor('Bahan')} (free over ${FREE_DELIVERY_OVER_MMK.toLocaleString()} MMK)`,
    feeMmk: deliveryFeeFor('Bahan', 0),
    eta: deliveryEtaFor('Bahan'),
  },
  Hlaing: {
    zone: 'Hlaing',
    title: 'Hlaing',
    description: `Delivery ${deliveryFeeFor('Hlaing', 0).toLocaleString()} MMK · ${deliveryEtaFor('Hlaing')} (free over ${FREE_DELIVERY_OVER_MMK.toLocaleString()} MMK)`,
    feeMmk: deliveryFeeFor('Hlaing', 0),
    eta: deliveryEtaFor('Hlaing'),
  },
  'All Zones': {
    zone: 'All Zones',
    title: 'Yangon-wide delivery',
    description: `Zone fees ${Math.min(...DELIVERY_ZONES.map((z) => deliveryFeeFor(z, 0))).toLocaleString()}–${Math.max(...DELIVERY_ZONES.map((z) => deliveryFeeFor(z, 0))).toLocaleString()} MMK. Free over ${FREE_DELIVERY_OVER_MMK.toLocaleString()} MMK grocery subtotal.`,
    feeMmk: 0,
    eta: '30–60 min',
  },
};
