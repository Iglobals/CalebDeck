# CalebDeck - Premium Campus Food Delivery Platform

A complete, high-fidelity, production-ready web application for campus food delivery with premium design and user experience.

## 🎨 Design System

**Color Palette:**
- Background: `#FAF9F6` (Warm off-white)
- Text: `#121212` (Almost black)
- Primary Gold: `#FCD34D` (CTAs, highlights)
- Secondary Purple: `#7C3AED` (Trust, categories)
- Border: `#E5E2DC` (Light gray)
- Subtle: `#9C8F7F` (Muted text)

**Typography:**
- Headings: Satoshi Bold / Inter Display Bold
- Body: Inter Regular
- Letter spacing: Tight (-0.02em for headings)
- Line height: Generous (1.6 for body)

**Spacing:**
- Base grid: 24px
- Vertical rhythm: 40–64px
- Border radius: 8px (inputs), 12px (buttons), 16px (cards)

## 📁 Project Structure

```
/src/app/
├── components/
│   ├── design-system/         # Core design system components
│   │   ├── Logo.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── ProgressStepper.tsx
│   │   └── PriceAnimation.tsx
│   └── figma/
│       └── ImageWithFallback.tsx
├── pages/
│   ├── student/               # Student-facing pages
│   │   ├── LandingPage.tsx
│   │   ├── CafeteriaSelection.tsx
│   │   ├── PlateBuilder.tsx   # ⭐ Star feature
│   │   ├── Checkout.tsx
│   │   └── OrderSuccess.tsx
│   ├── admin/                 # Admin dashboard
│   │   └── AdminDashboard.tsx
│   ├── rider/                 # Rider dashboard
│   │   └── RiderDashboard.tsx
│   └── DesignSystem.tsx       # Component showcase
├── routes.ts                  # React Router config
└── App.tsx                    # Main app entry
```

## 🚀 Available Routes

### Student Pages
- `/` - Landing Page
- `/cafeteria` - Cafeteria Selection
- `/plate-builder` - Interactive Plate Builder (Main Feature)
- `/checkout` - Checkout Page
- `/order-success` - Order Success & Live Tracking

### Admin
- `/admin` - Admin Dashboard (Hostel-based order management)

### Rider
- `/rider` - Rider Dashboard (Mobile-optimized)

### Design System
- `/design-system` - Complete component library showcase

## ✨ Key Features

### 1. Landing Page
- Premium hero section with lifestyle imagery
- "How It Works" section
- Student testimonials
- Mobile-responsive navigation

### 2. Cafeteria Selection
- Side-by-side cafeteria cards
- Live status indicators
- Estimated prep times
- "Popular now" badges

### 3. Plate Builder ⭐ (Star Feature)
- **Two Plate Types:**
  - Main Plate (Rice, beans, yam + proteins + extras)
  - Swallow Plate (Fufu/eba + soup + proteins)
- **Interactive Steps:**
  - Step-by-step builder with glassmorphic cards
  - Quantity controls for each item
  - Live price updates with animations
- **Drinks & Snacks Add-on:**
  - Disabled until first plate added
  - Categorized (Drinks/Snacks)
  - No separate delivery fee
- **Smart Order Summary:**
  - Real-time calculation
  - ₦200 takeaway pack per plate
  - Delivery mode selector (Solo/Group)
  - Group order with 20% discount
  - Validation warnings
- **Sticky Summary Panel:**
  - Always visible order details
  - Expandable plate breakdown
  - Dynamic pricing
  - "Proceed to Checkout" CTA

### 4. Checkout
- Clean two-column layout
- Hostel dropdown with exact options:
  - **Girls:** Deborah, Mercy, Mary, Esme, Rebecca, Sussana Hall
  - **Boys:** Levi, Integrity, Elisha, Joseph, Joshua Hall
- Paystack security badge
- Order summary with delivery info

### 5. Order Success & Tracking
- Success confirmation
- Live order tracking with progress stepper
- Rider information card
- Real-time status updates
- Map integration ready

### 6. Admin Dashboard
- Linear/Stripe-inspired sidebar navigation
- KPI cards (Orders, Revenue, Riders, Delivery Time)
- **Hostel-based Batch Management:**
  - Group orders by hostel
  - Show pending count + total plates
  - Auto-assign to mapped riders
  - One-click dispatch per hostel
- Recent orders table
- Real-time status badges

### 7. Rider Dashboard
- Mobile-optimized web view
- Status toggle (Available/Busy/Offline)
- Current batch card
- Order list for assigned hostels
- Quick actions: Call, Mark Picked Up, Mark Delivered
- Today's completion stats

## 🎯 Design Principles

1. **Premium Minimalism:** Clean layouts, generous spacing, restrained colors
2. **Consistent Hierarchy:** Gold for primary, purple for secondary
3. **Micro-interactions:** Hover scales (1.02), press feedback (0.98)
4. **Mobile-First:** Fully responsive, thumb-friendly
5. **Trust Signals:** Paystack integration, status indicators, live tracking

## 💎 Premium Details

- Glassmorphism on food cards (backdrop blur, semi-transparent)
- Smooth animations with Motion (Framer Motion)
- High-res Unsplash food photography
- Subtle shadows: `0 10px 30px rgba(18, 18, 18, 0.06)`
- Logo: "Caleb" (purple) + "Deck!" (gold with underline)
- $5M+ funded startup aesthetic

## 🛠️ Technical Stack

- **React** with TypeScript
- **React Router** (Data mode for navigation)
- **Tailwind CSS v4** (Custom theme)
- **Motion** (Animations)
- **Lucide React** (Icons)
- **Unsplash** (Food imagery)

## 📱 Responsive Design

- Desktop: 1280px+ (70/30 split for plate builder)
- Tablet: Stacked layouts, adjusted grids
- Mobile: Bottom sheet summaries, full-width builders

## 🎨 Component Showcase

Visit `/design-system` to see:
- Color palette
- Logo variations
- Button states (Primary, Secondary, Ghost)
- Card types (Standard, Glass, Hoverable)
- Form inputs
- Badges & status dots
- Progress stepper
- Price animations
- Typography scale
- Spacing & layout system

## 🌟 Standout Features

1. **Plate Builder Logic:**
   - Main: Multiple bases/proteins/extras with quantities
   - Swallow: Radio selection for swallow/soup, then quantities
   - Smart validation (can't add plate without required items)
   - Reset after each plate addition

2. **Group Orders:**
   - 20% delivery discount
   - Group size selector (2, 4, 6, 8, 10)
   - Warning if plate count < group size
   - Live savings calculation

3. **Admin Efficiency:**
   - Hostel-based batching (not manual rider assignment)
   - Auto-assign to hostel's mapped riders
   - One dispatch action per hostel
   - Real-time order monitoring

4. **Rider Experience:**
   - Only see orders for assigned hostels
   - Batch view for efficiency
   - Quick status updates
   - Completion tracking

## 🎓 Perfect For

- University/college campuses
- High-volume food delivery
- Multi-location operations
- Premium student services

---

**CalebDeck** - Skip the queue. Premium campus food delivery. 🍽️✨
