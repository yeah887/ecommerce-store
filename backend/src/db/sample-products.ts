import type { Category } from '@store/shared';

interface SampleProduct {
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  images: string[];
}

/** Three random photos per product, so the gallery has something to show. */
const images = (seed: string) => [1, 2, 3].map((n) => `https://picsum.photos/seed/${seed}${n > 1 ? `-${n}` : ''}/900/600`);

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear headphones with active noise cancelling, 30-hour battery life and a foldable design for travel.',
    priceCents: 17999,
    category: 'electronics',
    images: images('headphones'),
  },
  {
    name: 'Mechanical Keyboard',
    description: 'Compact 75% mechanical keyboard with hot-swappable switches and a warm white backlight.',
    priceCents: 8999,
    category: 'electronics',
    images: images('keyboard'),
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof speaker with deep bass and 12 hours of playback. Pairs two units for stereo sound.',
    priceCents: 5999,
    category: 'electronics',
    images: images('speaker'),
  },
  {
    name: '4K Webcam',
    description: 'Ultra HD webcam with autofocus, dual microphones and a privacy shutter for video calls.',
    priceCents: 11950,
    category: 'electronics',
    images: images('webcam'),
  },
  {
    name: 'The Pragmatic Programmer',
    description: 'A classic book on the craft of software development, full of practical advice for programmers.',
    priceCents: 4299,
    category: 'books',
    images: images('pragmatic'),
  },
  {
    name: 'Designing Data-Intensive Applications',
    description: 'A deep look at the ideas behind reliable, scalable and maintainable data systems.',
    priceCents: 4899,
    category: 'books',
    images: images('ddia'),
  },
  {
    name: 'The Hobbit',
    description: 'The fantasy novel about Bilbo Baggins and his unexpected journey, in a hardcover edition.',
    priceCents: 1999,
    category: 'books',
    images: images('hobbit'),
  },
  {
    name: 'Salt, Fat, Acid, Heat',
    description: 'A cookbook that teaches the four elements of good cooking, with illustrations and recipes.',
    priceCents: 3200,
    category: 'books',
    images: images('cookbook'),
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Soft crew-neck t-shirt made from organic cotton. Relaxed fit, available in classic white.',
    priceCents: 2499,
    category: 'clothing',
    images: images('tshirt'),
  },
  {
    name: 'Waterproof Rain Jacket',
    description: 'Lightweight, breathable rain jacket with taped seams and a packable hood.',
    priceCents: 12900,
    category: 'clothing',
    images: images('jacket'),
  },
  {
    name: 'Merino Wool Beanie',
    description: 'Warm, itch-free merino wool beanie for cold days on the trail or in the city.',
    priceCents: 2999,
    category: 'clothing',
    images: images('beanie'),
  },
  {
    name: 'Everyday Running Shoes',
    description: 'Cushioned running shoes with a breathable mesh upper for daily training runs.',
    priceCents: 10999,
    category: 'clothing',
    images: images('shoes'),
  },
  {
    name: 'Cast Iron Skillet',
    description: 'Pre-seasoned 26 cm cast iron skillet that goes from stovetop to oven.',
    priceCents: 3999,
    category: 'home',
    images: images('skillet'),
  },
  {
    name: 'Pour-Over Coffee Set',
    description: 'Glass pour-over coffee maker with a reusable stainless steel filter and a matching mug.',
    priceCents: 4450,
    category: 'home',
    images: images('coffee'),
  },
  {
    name: 'Linen Bed Sheet Set',
    description: 'Breathable stonewashed linen sheets that get softer with every wash. Queen size.',
    priceCents: 15900,
    category: 'home',
    images: images('linen'),
  },
  {
    name: 'Ceramic Plant Pot',
    description: 'Matte ceramic plant pot with a drainage hole and bamboo saucer, 20 cm diameter.',
    priceCents: 2250,
    category: 'home',
    images: images('plantpot'),
  },
  {
    name: 'Yoga Mat',
    description: 'Non-slip 6 mm yoga mat with a carrying strap, made from natural rubber.',
    priceCents: 4999,
    category: 'sports',
    images: images('yogamat'),
  },
  {
    name: 'Adjustable Dumbbells',
    description: 'Pair of adjustable dumbbells from 2 to 24 kg with a quick-change dial.',
    priceCents: 29900,
    category: 'sports',
    images: images('dumbbells'),
  },
  {
    name: 'Insulated Water Bottle',
    description: 'Stainless steel bottle that keeps drinks cold for 24 hours or hot for 12. 750 ml.',
    priceCents: 2799,
    category: 'sports',
    images: images('bottle'),
  },
  {
    name: 'Trail Running Backpack',
    description: 'Lightweight 12 L running backpack with a hydration sleeve and chest straps.',
    priceCents: 8499,
    category: 'sports',
    images: images('backpack'),
  },
];
