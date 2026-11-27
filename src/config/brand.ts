/**
 * CalebDeck — Centralized Brand Architecture & Product Configuration
 *
 * Keeps umbrella brand metadata, product naming (especially the working title
 * "Caleb Life"), verified historical milestones, and authentic testimonials
 * in one place so future updates require minimal changes.
 */

export const BRAND_CONFIG = {
  name: 'CalebDeck',
  parentCompany: 'IGLOBALS TECHNOLOGY',
  parentUrl: 'https://iglobalstech.com.ng',
  siteUrl: 'https://calebdeck.com',
  supportPhoneDisplay: '0807 255 0635',
  supportPhoneE164: '+2348072550635',
  supportWhatsappUrl: 'https://wa.me/2348072550635',
  socialXUrl: 'https://x.com/iglobalstechinc',
  socialXHandle: '@iglobalstechinc',
} as const;

export const PRODUCTS_CONFIG = {
  fashion: {
    id: 'fashion',
    name: 'CalebDeck Fashion',
    shortName: 'Fashion',
    status: 'ACTIVE' as const,
    statusLabel: 'Active Product',
    path: '/fashion',
    logoUrl: '/avaters/calebdeck-fashion-logo-transparent.png',
    tagline: 'Curated streetwear, footwear, and contemporary essentials.',
    description:
      'Shop curated apparel, statement tees, footwear, bags, and accessories from standout labels — with structured weekly batch fulfillment and seamless checkout.',
  },
  business: {
    id: 'business',
    name: 'CalebDeck Business',
    shortName: 'Business',
    status: 'ACTIVE' as const,
    statusLabel: 'Active Platform',
    path: '/business',
    logoUrl: '/avaters/calebdeck-business-logo-transparent.png',
    tagline: 'Put your student or independent brand in front of real daily traffic.',
    description:
      'A dedicated visibility and product-discovery showcase for student entrepreneurs and emerging brands. Featured products appear directly on CalebDeck — connecting founders with high-intent visitors across our fashion store and upcoming gaming community, complete with direct WhatsApp lead routing and referral click tracking.',
  },
  gaming: {
    id: 'caleb-life',
    /** Working product name — update here if final brand naming changes */
    name: 'Caleb Life',
    shortName: 'Caleb Life',
    status: 'COMING_SOON' as const,
    statusLabel: 'Coming Soon · In Development',
    path: '/caleb-life',
    sectionId: 'caleb-life',
    anchor: '/#caleb-life',
    tagline: 'An interactive social gaming experience built around culture, choices, and everyday hustle.',
    description:
      'Inspired by the energy of modern Nigerian social life sims, Caleb Life is a new interactive world currently in development under the CalebDeck ecosystem — crafted around relatable stories, status, community, and play.',
  },
} as const;

export interface HistoricalMetric {
  value: string;
  label: string;
  context: string;
}

/**
 * CEO-confirmed & database-audited historical milestones from CalebDeck's
 * first chapter of campus operations. Framed strictly as historical impact,
 * never as active food/mart/data operations or company profit.
 */
export const HISTORICAL_IMPACT_METRICS: HistoricalMetric[] = [
  {
    value: '1,000+',
    label: 'Students served',
    context: 'Across individual, group, and campus-wide deliveries during our first operational chapter.',
  },
  {
    value: '₦3M+',
    label: 'Transactions facilitated',
    context: 'Cumulative customer order volume processed across CalebDeck’s historical campus services.',
  },
];

export interface VerifiedTestimonial {
  id: string;
  quote: string;
  author: string;
  attribution: string;
  eraLabel: string;
}

/**
 * Genuine student feedback preserved verbatim from CalebDeck's verified
 * campus operations (`LandingPage.tsx` approved quotes + live Firestore `reviews`).
 */
export const VERIFIED_TESTIMONIALS: VerifiedTestimonial[] = [
  {
    id: 'tolu-law',
    quote: 'I ordered instead of joining the cafeteria line and my food came while I was still in the hostel.',
    author: 'Tolu',
    attribution: '300L Law',
    eraLabel: 'Campus Delivery Chapter',
  },
  {
    id: 'favour-acct',
    quote: 'Clear pickup point, smooth rider call, and no confusion. That is what made me order again.',
    author: 'Favour',
    attribution: '100L Accounting',
    eraLabel: 'Campus Delivery Chapter',
  },
  {
    id: 'daniel-masscomm',
    quote: 'I like that it is not just meals. Small campus needs can come without me leaving my room area.',
    author: 'Daniel',
    attribution: '200L Mass Comm',
    eraLabel: 'Campus Delivery Chapter',
  },
  {
    id: 'firestore-cd75134',
    quote: 'Good delivery time',
    author: 'Anonymous Student',
    attribution: 'Verified 5★ Order Review',
    eraLabel: 'Campus Delivery Chapter',
  },
];

export interface FashionShowcaseItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  imageUrl: string;
}

/**
 * Authentic in-stock items from live `fashion_inventory` used as immediate
 * visual showcase fallback before live Firestore subscription updates.
 */
export const CURATED_FASHION_SHOWCASE_FALLBACK: FashionShowcaseItem[] = [
  {
    id: '5EUS545WslzFOd3tKCbv',
    name: 'Refused Change Collared Sweatshirt',
    brand: 'Assemble',
    category: 'T-shirts',
    price: 34999,
    imageUrl: 'https://res.cloudinary.com/dpwx4djzx/image/upload/v1792417512/fashion_items/be859d0f-a7ba-4aed-a6bf-5a1218ecff3a.webp',
  },
  {
    id: '0Kzxq1TbsXrutyb2v2qn',
    name: 'Shades of Brown',
    brand: 'Suede Chunky Penny Loafers',
    category: 'Footwear',
    price: 79999,
    imageUrl: 'https://res.cloudinary.com/dpwx4djzx/image/upload/v1791561252/fashion_migration/0Kzxq1TbsXrutyb2v2qn_main.webp',
  },
  {
    id: '5bjcS1mKTg9LQNgowGc6',
    name: 'Luxe Lock Mini Crossbody Bag',
    brand: 'Élan Paris',
    category: 'Accessories',
    price: 79999,
    imageUrl: 'https://res.cloudinary.com/dpwx4djzx/image/upload/v1792420840/fashion_items/e445fa01-a7f7-48a2-ac7d-9cd7885e1862.webp',
  },
  {
    id: '3yHarQj1rs9oJxfRBfnt',
    name: 'Street In Gemini Embroidered Cap',
    brand: 'Gemini',
    category: 'Headwears',
    price: 21999,
    imageUrl: 'https://res.cloudinary.com/dpwx4djzx/image/upload/v1792420622/fashion_items/896ca4ba-8778-42d0-b342-0c44ab4f096d.webp',
  },
];
