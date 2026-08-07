import { INITIAL_GROCERIES } from '../data/groceries';
import type { DietaryRestriction, GroceryItem, Order, OrderStatus, PaymentMethod, DeliveryAddress, CartItem } from '../types';
import type { ApiOrder, ApiProduct } from './shopApi';

const META_BY_NAME = new Map(INITIAL_GROCERIES.map((g) => [g.name.toLowerCase(), g]));

export function mapProductToGrocery(p: ApiProduct): GroceryItem {
  const meta = META_BY_NAME.get((p.name || '').toLowerCase());
  const imageUrl =
    p.images?.find((i) => i.path)?.path ||
    meta?.imageUrl ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

  return {
    id: String(p.id),
    name: p.name,
    description: p.description || meta?.description || '',
    category: meta?.category || 'General',
    price: Number(p.price),
    currency: meta?.currency || 'MMK',
    imageUrl,
    stock: Number(p.stock ?? 0),
    maxStock: meta?.maxStock ?? Math.max(Number(p.stock ?? 0), 1),
    availabilityZone: meta?.availabilityZone || 'All Zones',
    dietaryRestrictions: (meta?.dietaryRestrictions || []) as DietaryRestriction[],
    isSubscriptionAvailable: meta?.isSubscriptionAvailable ?? false,
    rating: meta?.rating ?? 0,
    unit: meta?.unit || 'unit',
  };
}

function mapApiStatus(status?: string): OrderStatus {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
    case 'DELIVERED':
      return 'delivered';
    case 'PROCESSING':
      return 'processing';
    case 'OUT_FOR_DELIVERY':
      return 'out_for_delivery';
    case 'CANCELLED':
      return 'cancelled';
    case 'PAID_STOCK_SHORTAGE':
      return 'processing';
    default:
      return 'pending';
  }
}

const fallbackPayment: PaymentMethod = {
  id: 'stripe',
  type: 'mpu',
  accountName: 'Stripe Checkout',
  accountNumber: '••••',
  isDefault: true,
};

const fallbackAddress: DeliveryAddress = {
  id: 'addr_api',
  name: 'Delivery',
  addressLine: 'Saved at checkout',
  city: 'Yangon',
  state: 'Yangon Region',
  zipCode: '',
  phone: '',
  isDefault: true,
};

export function mapApiOrderToUiOrder(order: ApiOrder, catalog: GroceryItem[]): Order {
  const items: CartItem[] = (order.orderItems || []).map((line) => {
    const product = line.product;
    const fromCatalog = product?.id
      ? catalog.find((g) => g.id === String(product.id))
      : undefined;
    const item =
      fromCatalog ||
      (product ? mapProductToGrocery(product) : {
          id: 'unknown',
          name: 'Product',
          description: '',
          category: 'General',
          price: Number(line.price) / Math.max(line.quantity, 1),
          currency: 'MMK',
          imageUrl: '',
          stock: 0,
          maxStock: 1,
          availabilityZone: 'All Zones' as const,
          dietaryRestrictions: [],
          isSubscriptionAvailable: false,
          rating: 0,
          unit: 'unit',
        });

    return {
      item,
      quantity: line.quantity,
      isSubscription: false,
    };
  });

  return {
    id: order.id,
    items,
    totalAmount: Number(order.totalPrice),
    currency: 'MMK',
    paymentMethod: fallbackPayment,
    deliveryAddress: fallbackAddress,
    status: mapApiStatus(order.status),
    createdAt: order.createdAt || new Date().toISOString(),
    deliveryLat: 16.8,
    deliveryLng: 96.15,
    step: mapApiStatus(order.status) === 'delivered'
      ? 4
      : mapApiStatus(order.status) === 'out_for_delivery'
        ? 3
        : mapApiStatus(order.status) === 'processing'
          ? 2
          : 1,
  };
}
