import { GroceryItem } from '../types';

export const INITIAL_GROCERIES: GroceryItem[] = [
  {
    id: 'g1',
    name: 'Shwe Bo Paw San Premium Rice',
    description: 'Highly acclaimed, premium long-grain aromatic rice grown in the fertile lands of Shwe Bo. Fluffy, fragrant, and perfect for local meals.',
    category: 'Pantry & Staples',
    price: 18500,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    stock: 45,
    maxStock: 50,
    availabilityZone: 'All Zones',
    dietaryRestrictions: ['Organic', 'Gluten-Free', 'Vegetarian', 'Vegan', 'Non-GMO'],
    isSubscriptionAvailable: true,
    rating: 4.9,
    unit: '5kg'
  },
  {
    id: 'g2',
    name: 'Fresh Shan State Organic Avocados',
    description: 'Creamy, rich avocados hand-picked from orchards in Kalaw, Shan State. Loaded with healthy fats and nutrients.',
    category: 'Fruits & Vegetables',
    price: 3800,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80',
    stock: 28,
    maxStock: 30,
    availabilityZone: 'Yankin',
    dietaryRestrictions: ['Organic', 'Gluten-Free', 'Vegan', 'Vegetarian', 'Non-GMO'],
    isSubscriptionAvailable: false,
    rating: 4.7,
    unit: '1kg'
  },
  {
    id: 'g3',
    name: 'Halal Free-Range Whole Chicken',
    description: 'Fresh, premium-quality free-range chicken, processed and certified strictly under Halal guidelines. Perfect for traditional curries.',
    category: 'Meat & Seafood',
    price: 12500,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80',
    stock: 12,
    maxStock: 15,
    availabilityZone: 'Bahan',
    dietaryRestrictions: ['Halal', 'Gluten-Free', 'Non-GMO'],
    isSubscriptionAvailable: false,
    rating: 4.8,
    unit: '1.2kg'
  },
  {
    id: 'g4',
    name: 'Traditional Shan Yellow Tofu',
    description: 'Authentic yellow tofu handmade from chickpea flour, following deep-rooted Shan traditions. Rich in plant-based proteins, gluten-free, and vegan-friendly.',
    category: 'Vegetarian Specialties',
    price: 2500,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    stock: 35,
    maxStock: 40,
    availabilityZone: 'All Zones',
    dietaryRestrictions: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Organic', 'Non-GMO'],
    isSubscriptionAvailable: false,
    rating: 4.9,
    unit: '400g'
  },
  {
    id: 'g5',
    name: 'Gluten-Free Almond & Seed Bread',
    description: 'Freshly baked artisanal loaf made with premium almond flour, flaxseeds, and sunflower seeds. Fully gluten-free and low-carb.',
    category: 'Bakery',
    price: 6500,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    stock: 8,
    maxStock: 12,
    availabilityZone: 'Downtown Yangon',
    dietaryRestrictions: ['Gluten-Free', 'Vegetarian', 'Dairy-Free'],
    isSubscriptionAvailable: true,
    rating: 4.5,
    unit: '450g'
  },
  {
    id: 'g6',
    name: 'Premium Shan Hills Arabica Coffee Beans',
    description: 'Exquisite single-origin Arabica coffee beans grown under shade trees in the highlands of Pyin Oo Lwin. Rich aroma with notes of chocolate and citrus.',
    category: 'Beverages',
    price: 14000,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80',
    stock: 4, // low stock alert!
    maxStock: 25,
    availabilityZone: 'All Zones',
    dietaryRestrictions: ['Organic', 'Vegan', 'Vegetarian', 'Gluten-Free'],
    isSubscriptionAvailable: true,
    rating: 4.9,
    unit: '500g'
  },
  {
    id: 'g7',
    name: 'Fresh Organic Baby Spinach',
    description: 'Tender baby spinach leaves cultivated using sustainable organic practices in local hydroponic farms. Pre-washed and ready to eat.',
    category: 'Fruits & Vegetables',
    price: 4500,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
    stock: 22,
    maxStock: 25,
    availabilityZone: 'Hlaing',
    dietaryRestrictions: ['Organic', 'Vegan', 'Vegetarian', 'Gluten-Free'],
    isSubscriptionAvailable: true,
    rating: 4.6,
    unit: '250g'
  },
  {
    id: 'g8',
    name: 'Organic Farm-Fresh Grass-Fed Milk',
    description: 'Pasteurized whole milk sourced from local grass-fed dairy cows. Highly nutritious, antibiotic-free, with no added hormones.',
    category: 'Dairy & Eggs',
    price: 5200,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    stock: 18,
    maxStock: 20,
    availabilityZone: 'Yankin',
    dietaryRestrictions: ['Organic', 'Vegetarian', 'Halal'],
    isSubscriptionAvailable: true,
    rating: 4.8,
    unit: '1 Liter'
  },
  {
    id: 'g9',
    name: 'Natural Organic Coconut Water',
    description: 'Pure, refreshing coconut water sourced from organic coastal groves. An excellent natural source of electrolytes with no added sugars.',
    category: 'Beverages',
    price: 2900,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=600&q=80',
    stock: 50,
    maxStock: 50,
    availabilityZone: 'All Zones',
    dietaryRestrictions: ['Organic', 'Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free'],
    isSubscriptionAvailable: true,
    rating: 4.7,
    unit: '500ml'
  },
  {
    id: 'g10',
    name: 'Premium Myanmar Raw Honey',
    description: '100% pure raw wildflower honey sourced sustainably from wild hives in the rural forests of Myanmar. Unfiltered to preserve all active enzymes.',
    category: 'Pantry & Staples',
    price: 11500,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=600&q=80',
    stock: 15,
    maxStock: 20,
    availabilityZone: 'Downtown Yangon',
    dietaryRestrictions: ['Organic', 'Gluten-Free', 'Vegetarian', 'Dairy-Free'],
    isSubscriptionAvailable: false,
    rating: 4.9,
    unit: '350g'
  },
  {
    id: 'g11',
    name: 'Organic Cashew & Almond Granola',
    description: 'Crunchy artisanal granola roasted with honey, coconut flakes, organic almonds, and cashews. Rich in fiber, but note it contains nuts.',
    category: 'Bakery',
    price: 8900,
    currency: 'MMK',
    imageUrl: 'https://images.unsplash.com/photo-1517881917430-e70dfb3610aa?auto=format&fit=crop&w=600&q=80',
    stock: 3, // low stock alert!
    maxStock: 15,
    availabilityZone: 'Bahan',
    dietaryRestrictions: ['Organic', 'Vegetarian', 'Dairy-Free'],
    isSubscriptionAvailable: true,
    rating: 4.4,
    unit: '400g'
  }
];

export const DIETARY_OPTIONS: { name: string; value: string }[] = [
  { name: '🌱 Vegan', value: 'Vegan' },
  { name: '🥗 Vegetarian', value: 'Vegetarian' },
  { name: '🌾 Gluten-Free', value: 'Gluten-Free' },
  { name: '🧬 Non-GMO', value: 'Non-GMO' },
  { name: '🥛 Dairy-Free', value: 'Dairy-Free' },
  { name: '🛡️ Halal', value: 'Halal' },
  { name: '🍎 Organic', value: 'Organic' }
];

export const ZONE_OPTIONS = [
  'All Zones',
  'Downtown Yangon',
  'Yankin',
  'Bahan',
  'Hlaing'
];

export interface ZoneDeliveryInfo {
  zone: string;
  status: 'normal' | 'delayed' | 'suspended';
  delayMinutes: number;
  title: string;
  description: string;
  badgeColor: 'emerald' | 'amber' | 'red';
}

export const ZONE_DELIVERY_STATUS: Record<string, ZoneDeliveryInfo> = {
  'Downtown Yangon': {
    zone: 'Downtown Yangon',
    status: 'normal',
    delayMinutes: 0,
    title: 'Express Delivery Active',
    description: 'Dispatches within 30-45 mins from Downtown Central Hub.',
    badgeColor: 'emerald'
  },
  'Yankin': {
    zone: 'Yankin',
    status: 'normal',
    delayMinutes: 0,
    title: 'On-Time Express Active',
    description: 'Standard delivery running smoothly (30-40 mins).',
    badgeColor: 'emerald'
  },
  'Bahan': {
    zone: 'Bahan',
    status: 'delayed',
    delayMinutes: 25,
    title: 'Monsoon Service Delay',
    description: 'Heavy rain & road slowdowns causing +25m dispatch delay in Bahan.',
    badgeColor: 'amber'
  },
  'Hlaing': {
    zone: 'Hlaing',
    status: 'delayed',
    delayMinutes: 45,
    title: 'Waterlogging Warning',
    description: 'Flash flooding near Hlaing sector causing +45m delivery delay.',
    badgeColor: 'amber'
  },
  'All Zones': {
    zone: 'All Zones',
    status: 'delayed',
    delayMinutes: 25,
    title: 'Weather Warnings Active in 2 Zones',
    description: 'Bahan (+25m) and Hlaing (+45m) currently have active weather delays.',
    badgeColor: 'amber'
  }
};

