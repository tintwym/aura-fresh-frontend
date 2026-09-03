/** Yangon delivery zones — fees in MMK. Free when grocery subtotal ≥ FREE_OVER_MMK. */
export const FREE_DELIVERY_OVER_MMK = 15_000;

export const DELIVERY_ZONES = [
  'Downtown Yangon',
  'Yankin',
  'Bahan',
  'Hlaing',
] as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

const FEE_BY_ZONE: Record<DeliveryZone, number> = {
  'Downtown Yangon': 2000,
  Yankin: 2500,
  Bahan: 3000,
  Hlaing: 3500,
};

const ETA_BY_ZONE: Record<DeliveryZone, string> = {
  'Downtown Yangon': '30–45 min',
  Yankin: '35–50 min',
  Bahan: '40–55 min',
  Hlaing: '45–60 min',
};

export function normalizeDeliveryZone(zone?: string | null): DeliveryZone {
  if (!zone) return 'Yankin';
  const lower = zone.toLowerCase();
  if (lower.includes('downtown')) return 'Downtown Yangon';
  if (lower.includes('bahan')) return 'Bahan';
  if (lower.includes('hlaing')) return 'Hlaing';
  if (lower.includes('yankin')) return 'Yankin';
  for (const z of DELIVERY_ZONES) {
    if (z.toLowerCase() === lower) return z;
  }
  return 'Yankin';
}

export function deliveryFeeFor(zone: string | null | undefined, grocerySubtotal: number): number {
  if (grocerySubtotal >= FREE_DELIVERY_OVER_MMK) return 0;
  return FEE_BY_ZONE[normalizeDeliveryZone(zone)];
}

export function deliveryEtaFor(zone: string | null | undefined): string {
  return ETA_BY_ZONE[normalizeDeliveryZone(zone)];
}
