export type DietaryRestriction = 'Gluten-Free' | 'Vegan' | 'Vegetarian' | 'Dairy-Free' | 'Organic' | 'Halal' | 'Nut-Free' | 'Non-GMO';

export interface GroceryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number; // in MMK
  currency: string; // "MMK" (and USD support)
  imageUrl: string;
  stock: number;
  maxStock: number;
  availabilityZone: 'Downtown Yangon' | 'Yankin' | 'Bahan' | 'Hlaing' | 'All Zones';
  dietaryRestrictions: DietaryRestriction[];
  isSubscriptionAvailable: boolean;
  rating: number;
  unit: string; // e.g., "500g", "1kg", "1 liter", "dozen"
  /** Shown for meat & dairy when the API provides expiryDate. */
  expiryDate?: string;
}

export interface CartItem {
  item: GroceryItem;
  quantity: number;
  isSubscription: boolean;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  /** Present on order history lines — required for product reviews. */
  orderItemId?: string;
}

export interface DeliveryAddress {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'kbzpay' | 'wavepay' | 'ayapay' | 'mpu' | 'digital_wallet' | 'mmqr' | 'apple_pay' | 'google_pay';
  accountName: string;
  accountNumber: string; // or masked phone/card
  maskedCardNumber?: string;
  isDefault: boolean;
}

export type OrderStatus = 'pending' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  deliveryAddress: DeliveryAddress;
  status: OrderStatus;
  createdAt: string;
  deliveryLat: number; // For map tracking
  deliveryLng: number;
  currentLat?: number;
  currentLng?: number;
  step: number; // 0 to 4 corresponding to stages
  subscriptionInfo?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    nextBillingDate: string;
  };
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  estimatedDeliveryWindow?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  /** Auth method from API: LOCAL | GOOGLE | APPLE */
  authProvider?: string;
  loyaltyPoints: number;
  balance: number; // Simulated wallet balance
  addresses: DeliveryAddress[];
  paymentMethods: PaymentMethod[];
  orderHistory: Order[];
  /** Coupon codes unlocked via loyalty redeem; required at checkout. */
  redeemedCoupons: string[];
  /** Demo wallet top-ups used this session (capped). */
  walletTopUpsUsed: number;
}

export interface SalesRecord {
  date: string;
  sales: number;
  ordersCount: number;
}

export interface InventoryAlert {
  itemId: string;
  itemName: string;
  stock: number;
  category: string;
}

export interface CategoryDistribution {
  category: string;
  value: number;
}

export interface UserEngagement {
  activeUsers: number;
  sessionLength: number; // minutes
  conversionRate: number; // percentage
}

export interface AdminAnalytics {
  dailySales: SalesRecord[];
  inventoryAlerts: InventoryAlert[];
  categoryDistribution: CategoryDistribution[];
  userEngagement: UserEngagement;
}
