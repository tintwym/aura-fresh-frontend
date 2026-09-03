import type { DietaryRestriction, GroceryItem, Order, OrderStatus, PaymentMethod, DeliveryAddress, CartItem } from '../types';
import type { ApiCart, ApiOrder, ApiProduct } from './shopApi';

const MEAT_DAIRY = /\b(meat|dairy|beef|chicken|pork|fish|milk|cheese|yogurt|butter)\b/i;

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

function formatExpiry(expiryDate?: string): string | undefined {
  if (!expiryDate) return undefined;
  const d = new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return expiryDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Map API product → UI grocery item using only live API fields. */
export function mapProductToGrocery(p: ApiProduct): GroceryItem {
  const stock = Number(p.stock ?? 0);
  const category = p.category?.trim() || 'General';
  const needsExpiry = MEAT_DAIRY.test(category) || MEAT_DAIRY.test(p.name || '');

  return {
    id: String(p.id),
    name: p.name,
    description: p.description || '',
    category,
    price: Number(p.price),
    currency: 'MMK',
    imageUrl: p.images?.find((i) => i.path)?.path || DEFAULT_IMAGE,
    stock,
    maxStock: Math.max(stock, 1),
    availabilityZone: 'All Zones',
    dietaryRestrictions: [] as DietaryRestriction[],
    isSubscriptionAvailable: false,
    rating: Number(p.averageRating) > 0 ? Number(p.averageRating) : 0,
    unit: 'unit',
    expiryDate: needsExpiry ? formatExpiry(p.expiryDate) : undefined,
    reviewCount: Number(p.reviewCount) || 0,
  };
}

export function mapApiCartToCartItems(cart: ApiCart | null, catalog: GroceryItem[]): CartItem[] {
  if (!cart?.cartItems?.length) return [];
  return cart.cartItems
    .map((line) => {
      const productId = String(line.product?.id ?? '');
      if (!productId) return null;
      const item =
        catalog.find((g) => g.id === productId) ||
        (line.product ? mapProductToGrocery(line.product) : null);
      if (!item) return null;
      return {
        item,
        quantity: line.quantity,
        isSubscription: false,
      };
    })
    .filter((line): line is CartItem => line != null);
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

const stripePayment: PaymentMethod = {
  id: 'stripe',
  type: 'mpu',
  accountName: 'Stripe Checkout',
  accountNumber: '••••',
  isDefault: true,
};

function deliveryFromOrder(order: ApiOrder): DeliveryAddress {
  const line = [order.deliveryAddress1, order.deliveryAddress2, order.deliveryUnit, order.deliveryFloor]
    .filter(Boolean)
    .join(', ');
  if (!line && !order.deliveryCity) {
    return {
      id: 'addr_api',
      name: 'Delivery',
      addressLine: 'Address on file',
      city: 'Yangon',
      state: 'Yangon Region',
      zipCode: '',
      phone: '',
      isDefault: true,
    };
  }
  return {
    id: 'addr_order',
    name: 'Delivery',
    addressLine: line || order.deliveryCity || '',
    city: order.deliveryCity || 'Yangon',
    state: order.deliveryState || 'Yangon Region',
    zipCode: order.deliveryZipCode || '',
    phone: '',
    isDefault: true,
  };
}

export function mapApiOrderToUiOrder(order: ApiOrder, catalog: GroceryItem[]): Order {
  const items: CartItem[] = (order.orderItems || []).map((line) => {
    const product = line.product;
    const fromCatalog = product?.id
      ? catalog.find((g) => g.id === String(product.id))
      : undefined;
    const item =
      fromCatalog ||
      (product
        ? mapProductToGrocery(product)
        : {
            id: 'unknown',
            name: 'Product',
            description: '',
            category: 'General',
            price: Number(line.price) / Math.max(line.quantity, 1),
            currency: 'MMK',
            imageUrl: DEFAULT_IMAGE,
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
      orderItemId: line.id,
    };
  });

  const status = mapApiStatus(order.status);

  return {
    id: order.id,
    items,
    totalAmount: Number(order.totalPrice),
    currency: 'MMK',
    paymentMethod: stripePayment,
    deliveryAddress: deliveryFromOrder(order),
    status,
    createdAt: order.createdAt || new Date().toISOString(),
    deliveryLat: 16.8,
    deliveryLng: 96.15,
    step:
      status === 'delivered'
        ? 4
        : status === 'out_for_delivery'
          ? 3
          : status === 'processing'
            ? 2
            : 1,
  };
}

/** Purchase frequencies for Quick Reorder — derived from real order history. */
export function purchaseCountsFromOrders(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const line of order.items) {
      const id = line.item.id;
      counts[id] = (counts[id] || 0) + line.quantity;
    }
  }
  return counts;
}
