# CalebDeck: Premium Campus Food Delivery Platform
## Comprehensive Project Documentation

**Version:** 1.0  
**Status:** Development (Launch: April 2026)  
**Prepared:** February 2026

---

## Executive Summary

**CalebDeck** is a high-fidelity, production-ready web application that transforms campus food delivery through intelligent batching, real-time tracking, and a premium user experience. Positioned as premium campus dining infrastructure, CalebDeck eliminates the inefficiency of traditional cafeteria queues by introducing a direct-to-hostel delivery model with batch optimization.

---

## 1. Problem Statement & Solution

### **The Problem**

Campus students across universities face recurring friction in their daily food procurement:

- **Time Loss:** Students waste 30–45 minutes per meal waiting in cafeteria queues, disrupting study schedules and class attendance.
- **Food Quality Degradation:** Prolonged heat retention causes prepared meals to lose taste, texture, and nutritional quality by the time students receive them.
- **Scheduling Conflicts:** Meals must be coordinated around class times, creating gaps in nutrition and inconsistent dining patterns.
- **Operational Inefficiency:** Cafeterias operate reactively—preparing large batches without demand visibility leads to food waste and inconsistent availability.
- **Limited Customization:** Rigid meal options don't accommodate dietary preferences or portion control needs.
- **Accessibility Barriers:** Physical distance and mobility challenges make accessing the cafeteria difficult for some students.

### **The Solution**

CalebDeck introduces a **batching-first food delivery model** that aligns supply with demand in real time:

#### **For Students:**
- **Zero Queue Experience:** Browse cafeteria menus on-demand from any location (hostel room, library, campus).
- **Customizable Plates:** Interactive plate builder allows personalization—select preferred bases (rice, beans, yam), proteins, and side dishes with exact portion control.
- **5–10 Minute Delivery:** Intelligent batching ensures meals are prepared fresh and delivered to hostel rooms within minutes of order finalization.
- **Live Tracking:** Real-time order status visibility—"Received → Out for Delivery → On The Way → Delivered."
- **Group Ordering Discounts:** Students can share delivery costs, reducing individual fees by up to 30% through group batching (2–10 person groups).
- **Payment Security:** Integrated Paystack payment gateway ensures PCI-compliant, secure transactions.

#### **For Cafeteria Admins:**
- **Demand-Driven Operations:** Orders flow in real-time, enabling cafeterias to prepare meals on-demand rather than speculative batch cooking.
- **Hostel-Based Route Optimization:** Orders are automatically grouped by hostel location, reducing delivery time and fuel costs.
- **Real-Time Analytics:** KPI dashboards show order volume, revenue, delivery efficiency, and rider performance.
- **Inventory Visibility:** Track which menu items are popular, enabling better procurement and waste reduction.
- **One-Click Dispatch:** Batch management is reduced to assigning all orders for a hostel to the designated rider(s).

#### **For Delivery Riders:**
- **Batch-Based Route Efficiency:** Instead of individual deliveries, riders receive pre-optimized batches grouped by hostel.
- **Mobile-First Interface:** Lightweight web app designed for on-device order management with quick status updates.
- **Earnings Clarity:** Per-delivery payout structure with transparent calculation—riders track daily earnings in real time.
- **Reduced Confusion:** Clear hostel assignments eliminate the need to hunt for delivery addresses.

---

## 2. Overall Project Vision

### **Target Market**
- **Primary:** University and college campuses (5,000–50,000+ student population)
- **Geographic:** Sub-Saharan Africa (Nigeria)—optimized for connectivity and payment infrastructure
- **Use Case:** Daily meal provisioning for resident and day students

### **Market Position**
CalebDeck positions itself at the **premium segment** of campus services:
- Not a discount food delivery app (e.g., Uber Eats)
- Comparable to **specialized campus services** (e.g., campus laundry, stationery delivery)
- Brand promise: **"Skip the queue. Premium campus food delivery."**

### **Success Definition**
- Campus adoption with 30%+ ordering penetration within 6 months of launch
- Average 50+ orders per day per campus location
- Delivery times consistently under 10 minutes
- Student satisfaction rating >4.5/5.0

---

## 3. Website Features

### **A. Public Landing Page**
**Purpose:** Introduce CalebDeck value proposition and drive initial app adoption  
**Key Sections:**
1. **Hero Section**
   - Premium lifestyle hero image (student in hostel room receiving delivery)
   - Headline: "Skip the queue. Premium food delivery."
   - Tagline describing time savings and customization
   - Primary CTA: "Order Now" (directs to cafeteria selection)
   - Secondary CTA: "Learn More" (product features page)

2. **How It Works**
   - Three-step visual guide:
     - Step 1: "Build Your Plate" (customize meal)
     - Step 2: "We Batch & Prepare" (system groups orders)
     - Step 3: "Delivered to Your Room" (hostel-direct delivery)
   - Icons and descriptions for each step

3. **Social Proof**
   - Student testimonials (name, hostel, quote, avatar)
   - Key metrics: "20k+ Orders Delivered," "4.9/5 Rating"

4. **Call-to-Action Section**
   - Reinforce value proposition
   - Final order CTA with countdown/urgency element

5. **Footer**
   - Navigation to legal pages (Privacy, Terms, Support)
   - Home link for easy return
   - Copyright notice

---

### **B. Student Ordering Interface**

#### **1. Cafeteria Selection**
**Purpose:** Let students choose their desired cafeteria  
**Layout:**
- Header with back button and branding
- Cards for each campus cafeteria (e.g., "Old Cafeteria," "New Cafeteria")
- Card details:
  - Cafeteria name and image
  - "Popular now" status badge
  - Estimated prep time
  - Availability indicator
- Mobile-responsive grid (1 column on mobile, 2+ on desktop)

---

#### **2. Interactive Plate Builder** ⭐ **[Star Feature]**
**Purpose:** Core product—enable intuitive, interactive food customization  

**Structure:**
The plate builder uses a **step-by-step glassmorphic card interface** with real-time price updates.

**A. Plate Type Selection**
Users select one of two plate archetypes:
- **Main Plate:** Rice/Beans/Yam base + Protein + Extras
  - Base options (select one): Jollof Rice, White Rice, Fried Rice, Beans, Yam
  - Protein options (add multiple): Beef, Chicken, Fish, Eggs
  - Bread/Extras (add multiple): Plantain, Coleslaw, Sauce, Greens
  
- **Swallow Plate:** Swallow + Soup + Protein
  - Swallow options (select one): Fufu, Eba, Pounded Yam
  - Soup (select one): Egusi, Pepper Soup, Okra Soup
  - Protein options (add multiple): Beef, Fish, Snails

**B. Item Selection & Quantity Control**
- For each item category, display menu items as cards with:
  - Item image (high-resolution)
  - Item name and brief description
  - Price per unit
  - Quantity controls: "−" button, quantity display, "+" button
  - Live price calculation

**C. Smart Validation**
- Cannot proceed to add-ons without selecting a complete plate
- Cannot add plate without required items (e.g., base + protein)
- Warning states: "Add a plate to enable drinks/snacks"

**D. Add-ons: Drinks & Snacks**
- Only appears after first plate is added
- Categories: Soft Drinks, Juices, Water, Snacks
- Item structure same as main plate items
- No separate delivery fee for add-ons

**E. Order Summary Panel (Sticky)**
- Always visible on screen (side panel on desktop, bottom sheet on mobile)
- Displays:
  - Each plate with itemized breakdown
  - Drinks/snacks breakdown
  - Subtotal price
  - Delivery mode selector (Solo / Group)
    - **Solo:** Full delivery fee (₦700)
    - **Group:** Reduced fee (₦560 per person in group)
  - Group size selector (2, 4, 6, 8, 10 people)
  - Warning if plate count < group size
  - Total price with live animation on price changes
  - Expandable plate details (collapsible sections)
  - "Proceed to Checkout" button (enabled only with valid order)

**F. Pricing Logic**
For each plate:
- Base Price = Sum of all items
- Takeaway Pack Fee: ₦200 per plate
- Delivery Fee: ₦700 solo OR ₦560 per person in group (max group: 10)
- Group Discount: Shared delivery cost reduces per-person fee by ~20%
- Total = (Plates × Base) + (Plates × 200) + Delivery

**G. Design Implementation**
- **Glassmorphism:** Food item cards use `backdrop-filter: blur()` with 10% opacity white background
- **Animations:** 
  - Price updates trigger brief bounce animation
  - Plate additions slide in smoothly
  - Hover states scale to 1.02
- **Color System:**
  - Primary CTA: Gold (#FCD34D)
  - Secondary actions: Purple (#7C3AED)
  - Item cards: Semi-transparent white on food imagery
- **Responsive:**
  - Desktop: Two-column layout (items left, summary right)
  - Tablet: Stacked, full-width items, sticky summary
  - Mobile: Single column, bottom sheet summary

---

#### **3. Checkout Page**
**Purpose:** Collect delivery information and process payment  

**Layout (2-Column on Desktop, Stacked on Mobile):**

**Left Column: Student Information**
- **Full Name** field (text input)
- **Phone Number** field (Nigerian format)
- **Hostel Selection** dropdown
  - **Girls Hostels:** Deborah Hall, Mercy Hall, Mary Hall, Esme Hall, Rebecca Hall, Sussana Hall
  - **Boys Hostels:** Levi Hall, Integrity Hall, Elisha Hall, Joseph Hall, Joshua Hall
- **Room Number** field (text input)
- **Delivery Instructions** (textarea—optional)
  - E.g., "Call before arriving," "Leave at door"

**Right Column: Order Summary & Payment**
- Order itemization (read-only recap from plate builder)
  - Each plate with items
  - Drinks/snacks
  - Fees breakdown
- **Total Cost** prominently displayed
- **Security Badge:** Paystack logo with "Secure Payment" text
- **Payment CTA:** "Proceed to Payment" button
  - Triggers Paystack modal
  - Handles card entry, bank transfer, mobile money via USSD

**Validation:**
- All required fields must be filled before payment
- Phone number validated for Nigeria region
- Hostel selection prevents delivery to invalid locations

---

#### **4. Order Success & Live Tracking**
**Purpose:** Confirm order placement and provide real-time delivery tracking  

**Success Screen (Initial):**
- Large success checkmark icon (animated)
- Order confirmation message: "Your order has been received!"
- Order ID and estimated delivery time
- Student details recap (name, hostel, room)
- Item recap (plates + add-ons)
- **"Track Order"** button to view live status

**Live Tracking Screen:**
- **Progress Stepper:** Visual timeline showing 4 steps:
  1. Received (order confirmed)
  2. Out for Delivery (being prepared + batched)
  3. On The Way (rider en route)
  4. Delivered (arrived at hostel)
- Current step highlighted with animation
- Estimated time remaining updated per step
- **Rider Information Card:**
  - Rider name and avatar
  - Rider phone number (clickable to call)
  - Hostel assignment (showing whose hostel has orders)
- **Order Details:**
  - Full item list
  - Delivery address
  - Contact information
- **Auto-Refresh:** Live updates every 10 seconds via Firestore subscription

---

### **C. Admin Dashboard** (Backend Management)
**Purpose:** Enable cafeteria managers to view, manage, and dispatch orders  

**Layout & Navigation:**
- Sidebar (fixed, top-to-bottom): Logo, nav items, logout
- Top bar: User info, theme toggle, settings
- Main content area: Dashboard cards + tables

**Key Sections:**

#### **1. KPI Overview Cards**
Displayed at dashboard top:
- **Total Orders (Today):** Count of completed orders
- **Revenue (Today):** Sum of all order totals
- **Active Riders:** Count of riders with status "Available"
- **Avg Delivery Time:** Mean delivery duration in minutes

#### **2. Hostel-Based Batch Management**
**Purpose:** Group orders by hostel and enable one-click dispatch  

**Layout:**
- Table with columns:
  - **Hostel Name** (e.g., "Deborah Hall")
  - **Pending Orders** (count)
  - **Total Plates** (sum of plates in all orders for hostel)
  - **Order Total** (₦ amount)
  - **Status** (badge: "Ready for Dispatch" / "Preparing" / "Dispatched")
  - **Actions** (Dispatch button, View Orders)

**Dispatch Workflow:**
1. Admin clicks "Dispatch" for a hostel
2. System auto-selects mapped rider(s) for that hostel
3. Confirmation modal shows:
   - Rider(s) assigned
   - Order count
   - Hostel address
   - Estimated arrival time
4. Admin clicks "Confirm Dispatch"
5. Rider receives notification and order batch appears in rider app

#### **3. Recent Orders (Read-Only Table)**
- Date & Time
- Student Name
- Hostel
- Items (brief)
- Total Price
- Status (Received / Out for Delivery / Delivered)
- Click to expand for full details

#### **4. Rider Management**
- List of all riders
- Availability status toggle
- Contact info
- Today's earnings
- Click to view detailed stats (delivery count, ratings, etc.)

---

### **D. Rider Dashboard** (Mobile-Optimized Web)
**Purpose:** Enable drivers to view, manage, and update order delivery status  

**Layout:**
- Minimalist mobile-first design
- Full-screen single column
- Large, touch-friendly buttons

**Sections:**

#### **1. Status Toggle**
- Large button: "Available" / "Busy" / "Offline"
- Color-coded (Green / Yellow / Gray)
- Status persists in database

#### **2. Current Batch Card**
Displays current hostel batch being delivered:
- **Hostel Name** (e.g., "Deborah Hall")
- **Order Count:** "4 orders for Deborah Hall"
- **Batched Items:** Quick summary
- **Quick Actions:**
  - "Call Admin" (phone link)
  - "Mark Picked Up" (marks batch as "Out for Delivery")
  - "Mark Delivered" (marks batch as "Delivered")

#### **3. Order List for Hostel**
For the current hostel batch, show each order:
- Order ID
- Student Name & Room Number
- Items (itemized preview)
- Special instructions
- "Call Student" action
- "Navigate" (maps integration ready)

#### **4. Today's Stats**
- Orders Completed
- Earnings (dynamic calculation per delivery)
- Next Shift Info

---

### **E. Legal & Information Pages**

#### **1. Privacy Policy**
- Legal disclosure of data collection practices
- Details on payment data processing
- Data protection measures
- Contact for privacy inquiries

#### **2. Terms of Service**
- User agreement for platform use
- Payment terms
- Liability disclaimers
- Modifications clause

#### **3. Support Page**
- FAQ covering:
  - "How do I place an order?"
  - "How long does delivery take?" (5–10 minutes)
  - "Can I cancel an order?"
- Contact options:
  - Email: support@calebdeck.com
  - Phone: +234 [placeholder]
- Support hours: 24/7

#### **4. Learn More Page**
- About CalebDeck value proposition
- How the student ordering flow works
- Getting started (visit site, browse, checkout—no signup required)

---

## 4. Technical Stack

### **Frontend**
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19+ | Component-based UI |
| **Language** | TypeScript | 5.6+ | Type safety, developer experience |
| **Routing** | React Router | 7+ | Client-side navigation (data mode) |
| **Styling** | Tailwind CSS | 4+ | Utility-first CSS, responsive design |
| **UI Components** | Radix UI | Latest | Accessible, unstyled primitives |
| **Icons** | Lucide React | Latest | Consistent icon library |
| **Animations** | Motion (Framer-compatible) | Latest | Smooth transitions, micro-interactions |
| **Forms** | React Hook Form + Zod | Latest | Form state + validation |
| **HTTP Client** | Axios | 1.6+ | API requests |
| **Date/Time** | date-fns | 3.6+ | Date formatting, calculations |
| **Build Tool** | Vite | 5+ | Fast dev server, optimized production builds |
| **Package Manager** | npm | 10+ | Dependency management |

### **Backend & Infrastructure**
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | Firebase Firestore | Real-time NoSQL, automatic scaling |
| **Authentication** | Firebase Auth | OAuth 2.0 integration (future rider/admin auth) |
| **Real-Time Updates** | Firestore Listeners | Order status subscriptions |
| **Payment Processing** | Paystack | PCI-compliant card/bank/USSD |
| **Image Hosting** | Unsplash (free tier) | High-quality food photography |
| **Hosting** | Vercel | Edge-deployed static site + serverless functions |
| **Domain** | calebdeck.com (custom) | Brand URL |

### **Development Tools**
| Tool | Purpose |
|------|---------|
| **Version Control** | Git / GitHub | Code repository & CI/CD |
| **IDE** | VS Code | Developer environment |
| **Linting** | ESLint | Code quality |
| **Formatting** | Prettier | Code style consistency |
| **Testing** | Jest + React Testing Library | Unit & component tests |
| **Product Design** | Figma | UI/UX design reference |

### **Deployment Pipeline**
1. **Local Development:** `npm run dev` (Vite dev server with HMR)
2. **Build:** `npm run build` (Vite production build)
3. **Deployment:** Push to GitHub → Vercel auto-deploys
4. **Monitoring:** Vercel analytics + Firebase console

---

## 5. Product Specifications

### **A. Core Entities & Data Model**

#### **1. Student (Implicit—No User Account)**
No explicit user system. Orders are anonymous with contact details:
- Full Name
- Phone Number
- Hostel
- Room Number
- Email (optional, for support)

#### **2. Cafeteria**
```
{
  id: string,
  name: string,                // "Old Cafeteria"
  description: string,
  image: URL,
  sections: string[],          // ["front", "back"]
  status: "open" | "closed",
  defaultRiders: Rider[],      // Riders assigned to deliver from this cafeteria
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **3. MenuItem**
```
{
  id: string,
  cafeteriaId: string,
  sectionId: string,           // "front" or "back"
  category: string,            // "bases", "proteins", "extras", "drinks"
  name: string,                // "Jollof Rice"
  description: string,
  price: number,               // in ₦
  image: URL,
  available: boolean,
  createdAt: timestamp
}
```

#### **4. Order**
```
{
  id: string,                  // "CD-20260226-001"
  studentName: string,
  studentPhone: string,
  studentEmail: string,
  hostel: string,              // hostelId
  hostelName: string,          // "Deborah Hall"
  room: string,
  plates: [                    // Array of customized plates
    {
      id: string,
      type: "main" | "swallow",
      items: [{ itemId, quantity, price }],
      total: number
    }
  ],
  drinksSnacks: [              // Drinks/snacks add-ons
    { itemId, quantity, price }
  ],
  deliveryMode: "solo" | "group",
  groupSize: number,           // 1, 2, 4, 6, 8, 10
  subtotal: number,
  takeawayFee: number,         // 200 per plate
  deliveryFee: number,
  total: number,
  paymentStatus: "pending" | "completed" | "failed",
  paymentReference: string,    // Paystack reference
  orderStatus: "PAID" | "OUT_FOR_DELIVERY" | "ON_THE_WAY" | "DELIVERED",
  assignedRiderId: string,     // Rider handling delivery
  cafeteriaId: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  deliveredAt: timestamp
}
```

#### **5. Rider**
```
{
  id: string,
  name: string,
  phone: string,
  email: string,
  avatar: URL,
  status: "available" | "busy" | "offline",
  assignedHostels: string[],   // Hostel IDs (e.g., ["deborah", "mercy"])
  todayOrders: number,
  todayEarnings: number,       // ₦
  rating: number,              // 1–5 average
  reviews: number,
  createdAt: timestamp
}
```

#### **6. Hostel**
```
{
  id: string,
  name: string,
  address: string,
  type: "girls" | "boys",      // Residential type
  defaultRiderId: string,      // Primary rider for this hostel
  backupRiders: string[],      // Secondary riders if primary unavailable
  createdAt: timestamp
}
```

---

### **B. User Flows**

#### **Flow 1: Student Ordering (Happy Path)**
1. Student visits calebdeck.com
2. Redirected to homepage
3. Clicks "Order Now" → Cafeteria Selection
4. Selects cafeteria (e.g., "Old Cafeteria")
5. Enters Plate Builder
6. Selects plate type → builds main plate (base + protein + extras)
7. Price updates in real-time
8. Clicks "Add Another Plate" or proceeds to add drinks/snacks
9. After final plate, adds drinks/snacks (optional)
10. Reviews order summary
11. Selects delivery mode:
    - Solo: ₦700 delivery
    - Group (e.g., 4 people): ₦560 per person = ₦2,240 total delivery
12. Clicks "Proceed to Checkout"
13. Enters details: Name, Phone, Hostel, Room, Instructions
14. Clicks "Proceed to Payment"
15. Paystack modal opens → student pays via card/bank/USSD
16. Payment confirmed
17. Order created in Firestore with status "PAID"
18. Redirected to Order Success page
19. System sends admin notification
20. Admin sees order in "Hostel-Based Batch Management"
21. Admin clicks "Dispatch Deborah Hall" (all Deborah orders)
22. Rider receives batch notification
23. Rider marks "Picked Up" → status = "OUT_FOR_DELIVERY"
24. Rider marks items delivered → status = "DELIVERED"
25. Student sees real-time progress on tracking page
26. Payment finalized; rider earnings recorded

#### **Flow 2: Admin Order Management**
1. Admin logs in (future: Firebase Auth)
2. Dashboard displays hostel batches sorted by readiness
3. Admin reviews KPIs (orders, revenue, active riders)
4. Prepares orders in kitchen per batch assignments
5. For each completed hostel batch, clicks "Dispatch"
6. Auto-assigns designated rider(s)
7. Rider receives notification
8. Admin monitors delivery progress in real-time
9. Receives completion notification when all orders in batch delivered

#### **Flow 3: Rider Delivery**
1. Rider opens app, toggles status to "Available"
2. Receives batch notification: "New batch for Deborah Hall (4 orders)"
3. Clicks to view batch:
   - Order list with student names, rooms, items
   - Route optimization (batched by floor/wing)
4. Marks batch "Picked Up" from cafeteria
5. Routes to Deborah Hall
6. Calls student or knocks room-by-room
7. Delivers meal, marks "Delivered" in app per order
8. Completes batch
9. Earnings calculated: Base (₦X per delivery) + Share of group delivery fees
10. Moves to next batch or offline

---

## 6. Functional Requirements

### **6.1 Student Portal**

#### **FR-S1: Homepage Access**
- User can view landing page without authentication
- Landing page is responsive across all devices
- CTA buttons correctly route to cafeteria selection
- Social proof (testimonials, metrics) displays correctly

#### **FR-S2: Cafeteria Selection**
- User sees list of available cafeterias
- Each cafeteria card displays:
  - Image
  - Name
  - Status (Open/Closed)
  - Estimated prep time
  - "Popular now" badge if applicable
- User can click cafeteria to enter plate builder
- Back button returns to home

#### **FR-S3: Plate Builder — Interactive Customization**
- User selects plate type: Main or Swallow
- **Main Plate:**
  - Displays eligible bases (radio selection, select one)
  - Displays proteins (checkbox/multi-select)
  - Displays extras (checkbox/multi-select)
  - Each item shows quantity controls (−/+)
  - Each item shows real-time price
- **Swallow Plate:**
  - Displays swallow options (radio, select one)
  - Displays soup options (radio, select one)
  - Displays proteins (checkbox/multi-select)
- **Add-Ons:**
  - Drinks & snacks only enabled after first plate
  - Same quantity control structure
- **Validation:**
  - Cannot proceed without required items
  - Cannot add to cart without valid plate
- **Price Calculation:**
  - Real-time total = (Items) + ₦200 takeaway + delivery
  - Reflects group discount if group delivery selected
- **Sticky Summary:**
  - Always visible
  - Expandable/collapsible section per plate
  - Shows delivery mode selector (Solo/Group)
  - Shows group size selector (impacts delivery fee)
  - Displays total cost with animations on price change

#### **FR-S4: Checkout & Payment**
- User enters:
  - Full Name (required)
  - Phone Number in Nigeria format (required)
  - Hostel selection from dropdown (required)
  - Room Number (required)
  - Delivery Instructions (optional)
- Hostel dropdown filtered by gender (Girls/Boys)
- Form validates before enabling payment
- Clicking "Proceed to Payment" opens Paystack modal
- Payment methods accepted:
  - Debit/Credit Card
  - Bank Transfer
  - Mobile Money (USSD)
- Order created in Firestore upon successful payment
- User redirected to Order Success page

#### **FR-S5: Order Tracking**
- Success page displays order confirmation
- Progress stepper shows 4 stages: Received → Out for Delivery → On The Way → Delivered
- Rider information card displays (name, avatar, phone)
- Student can call rider directly from app
- Real-time updates via Firestore subscription (refreshes every 10 seconds)
- Auto-scrolls to "Delivered" confirmation when status reaches final stage

---

### **6.2 Admin Portal**

#### **FR-A1: Dashboard Access**
- Admin can log in (future: Firebase Auth integration)
- Dashboard displays KPI cards:
  - Total Orders (Today)
  - Revenue (Today)
  - Active Riders
  - Avg Delivery Time
- KPI cards update in real-time

#### **FR-A2: Hostel-Based Batch Management**
- Admin sees table of hostels with pending orders
- Each row shows:
  - Hostel name
  - Pending order count
  - Total plate count for hostel
  - Order total (₦)
  - Status badge
- Clicking hostel row shows detailed order list for that hostel
- Admin can view items & special instructions per order
- "Dispatch" button opens confirmation modal:
  - Shows assigned rider(s)
  - Shows order count & hostel address
  - Asks for confirmation
- Clicking "Confirm" triggers:
  - Rider receives notification (Firebase message)
  - Hostel batch status changes to "Dispatched"
  - Rider can see orders in their dashboard

#### **FR-A3: Real-Time Order Monitoring**
- Recent Orders table shows all orders across all hostels
- Columns: Date/Time, Student Name, Hostel, Items, Total, Status
- Status badges visual (color-coded)
- Click row to expand full order details
- Table updates in real-time as orders progress

#### **FR-A4: Rider Management**
- List view of all riders
- For each rider:
  - Name, avatar, phone
  - Current status (Available/Busy/Offline)
  - Today's order count
  - Today's earnings
  - Average rating
- Click rider to view detailed stats & order history
- Admin can contact rider directly (phone)

---

### **6.3 Rider Portal**

#### **FR-R1: Status Management**
- Rider toggles between Available / Busy / Offline
- Status updates in real-time in admin dashboard
- Status persists across sessions

#### **FR-R2: Batch Assignment & Notification**
- Rider receives push notification for new batch assignment
- Notification shows: Hostel name, order count, items summary
- Clicking notification opens batch details

#### **FR-R3: Batch Order Management**
- Rider views all orders in current batch (grouped by hostel)
- For each order:
  - Student name, room number
  - Items list (with quantities)
  - Special delivery instructions
  - "Picked Up" button (marks batch as out for delivery)
  - "Delivered" button (marks individual order as complete)
- Rider can call student directly from order
- Can navigate to hostel using maps integration (future)

#### **FR-R4: Earnings Tracking**
- Daily earnings displayed
- Order count tracked
- Per-delivery payout calculated per order
- Transparent earnings breakdown shown

---

### **6.4 Payment & Billing**

#### **FR-P1: Paystack Integration**
- Secure payment modal opens on checkout
- Supports multiple payment methods (card, bank, USSD)
- Payment reference stored with order
- Failed payments handled with retry logic
- PCI compliance via Paystack processing

#### **FR-P2: Pricing Logic**
- Subtotal = Sum of all item prices
- Takeaway Fee = ₦200 × plate count
- Delivery Fee:
  - Solo: ₦700 flat
  - Group: ₦560 per person (group size 2–10)
- Total = Subtotal + Takeaway + Delivery
- Group discounts calculated & displayed

---

### **6.5 Legal & Support**

#### **FR-L1: Privacy Policy**
- Accessible from footer link
- Clearly outlines data collection (personal, payment)
- Lists data protection measures
- Provides contact for privacy inquiries

#### **FR-L2: Terms of Service**
- Accessible from footer link
- Outlines user responsibilities
- Includes payment & liability terms
- Updated periodically

#### **FR-L3: Support Center**
- FAQ section covers common questions
- Contact options (email, phone)
- 24/7 availability stated
- Responsive design for mobile support

#### **FR-L4: Learn More Page**
- Describes CalebDeck value prop
- Explains student ordering flow
- Getting started info (no signup required; visit, browse, checkout)

---

## 7. Non-Functional Requirements

### **7.1 Performance**

#### **NFR-P1: Page Load Time**
- **Target:** Initial page load < 3 seconds (Lighthouse score > 85)
- **Metrics:**
  - First Contentful Paint (FCP): < 1.5s
  - Largest Contentful Paint (LCP): < 2.5s
  - Cumulative Layout Shift (CLS): < 0.1
- **Implementation:**
  - Vite production build with tree-shaking
  - Image lazy-loading via Unsplash CDN
  - Code splitting per route
  - Firebase Firestore indexed queries

#### **NFR-P2: Runtime Performance**
- **Plate Builder interactions:** < 16ms per interaction (60 FPS)
- **Price updates:** Animate smoothly without jank
- **Real-time order tracking:** Update within 500ms of Firestore change

#### **NFR-P3: Bundle Size**
- **Target:** < 200 KB gzipped main bundle
- **Optimization:**
  - Modular Radix UI imports (only components used)
  - Tailwind CSS purging of unused utilities
  - Dynamic imports for admin/rider routes

---

### **7.2 Scalability**

#### **NFR-S1: Database Scaling**
- Firestore auto-scales to 10k+ concurrent readers
- Indexes on frequently queried fields (cafeteriaId, hostelId, orderStatus)
- Batch writes for bulk operations (admin dashboard)

#### **NFR-S2: Concurrent Users**
- Support 1,000+ concurrent active users per campus
- No degradation in page load or real-time updates
- Horizontal scaling via Vercel's edge network

#### **NFR-S3: Data Retention**
- Orders retained for 1 year for historical analysis
- Firestore automatic cleanup after retention period (future)

---

### **7.3 Security**

#### **NFR-SEC1: Payment Security**
- PCI DSS Level 1 compliance via Paystack
- No card/bank data stored locally
- Secure HTTPS for all API communication
- Paystack webhook verification for order confirmation

#### **NFR-SEC2: Data Privacy**
- GDPR-aligned privacy policy
- Student personal data encrypted in transit & at rest
- Firestore security rules restrict unauthorized access
- Rate limiting on checkout API (prevent brute-force payment attempts)

#### **NFR-SEC3: Authentication (Future)**
- Firebase Auth for admin & rider login
- OAuth 2.0 integration (Google, Apple)
- Session timeout after 30 minutes of inactivity

---

### **7.4 Reliability & Availability**

#### **NFR-R1: Uptime**
- **Target:** 99.5% uptime (SLA)
- **Implementation:**
  - Vercel CDN with 99.95% uptime guarantee
  - Firebase multi-region redundancy
  - Automated health checks & alerts

#### **NFR-R2: Disaster Recovery**
- Daily Firestore backups (automatic)
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 1 hour

#### **NFR-R3: Error Handling**
- Graceful degradation if payment fails
- Retry logic for failed Firestore writes (exponential backoff)
- User-friendly error messages (not technical jargon)
- Error logging to Sentry or similar (future)

---

### **7.5 Usability & Accessibility**

#### **NFR-U1: Mobile Responsiveness**
- **Breakpoints:**
  - Mobile: 320px–767px (single column, bottom sheets)
  - Tablet: 768px–1023px (stacked 2-column)
  - Desktop: 1024px+ (multi-column, sticky sidebars)
- **Touch Targets:** All buttons ≥ 48px × 48px
- **Viewport:** Responsive scaling, no horizontal scroll

#### **NFR-U2: Accessibility (WCAG 2.1 AA)**
- Semantic HTML (`<button>`, `<nav>`, `<form>`)
- ARIA labels on form inputs & icons
- Color contrast ≥ 4.5:1 for normal text
- Keyboard navigation fully supported (no JS-only interactions)
- Screen reader optimization via Radix UI

#### **NFR-U3: Dark Mode**
- Theme toggle switch on all pages
- Automatic detection of system preference
- Tailwind dark: prefix for all color utilities
- All text & backgrounds meet contrast requirements in both modes

#### **NFR-U4: Internationalization (Future)**
- UI text can be extracted to i18n JSON
- Support for multiple languages (English, Yoruba, Igbo)
- Currency & date formatting per locale

---

### **7.6 Maintainability**

#### **NFR-M1: Code Organization**
- Component-based architecture
- Utility functions in `/services`
- Context API for global state (theme, auth future)
- TypeScript strict mode for type safety
- ESLint + Prettier for code quality

#### **NFR-M2: Documentation**
- JSDoc comments on all exported functions
- README with setup & deployment instructions
- Storybook for component documentation (future)
- Inline comments for complex logic

#### **NFR-M3: Testing**
- Unit tests for utility functions (Jest)
- Component tests for UI (React Testing Library)
- E2E tests for critical flows (Cypress future)
- Minimum 60% code coverage

#### **NFR-M4: Deployment**
- Automated CI/CD via GitHub Actions
- Pre-commit linting via Husky
- Staging environment for QA before production
- Rollback capability (previous Vercel deployments)

---

## 8. Architecture Overview

### **8.1 System Architecture**

```
┌──────────────────────────────────────────────────────────┐
│                    CalebDeck Web App                      │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────┐     ┌──────────────┐    ┌─────────┐     │
│  │  React UI  │────→│ React Router │────│ State   │     │
│  │ Components │     │ (Data Mode)  │    │(Context)│     │
│  └────────────┘     └──────────────┘    └─────────┘     │
│        ↓                                       ↓          │
│  ┌────────────────────────────────────────────────┐      │
│  │         Firestore API Layer (Axios)           │      │
│  │  - Orders (CRUD)                              │      │
│  │  - Real-time listeners (subscriptions)        │      │
│  │  - Batch operations                           │      │
│  └────────────────────────────────────────────────┘      │
│                       ↓                                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │        Firebase Cloud (Google Infrastructure)   │    │
│  │                                                  │    │
│  │  ┌─────────────┐  ┌──────────────┐            │    │
│  │  │  Firestore  │  │ Auth (OAuth) │            │    │
│  │  │  - Orders   │  │ - Future     │            │    │
│  │  │  - Users    │  │   Auth       │            │    │
│  │  │  - Menu     │  │              │            │    │
│  │  └─────────────┘  └──────────────┘            │    │
│  └──────────────────────────────────────────────────┘    │
│                       ↓                                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │   External Integrations                          │    │
│  │ ┌──────────────┐  ┌────────────────────────┐   │    │
│  │ │  Paystack    │  │ Unsplash (Images CDN)  │   │    │
│  │ │  - Payments  │  │ - Food Photos          │   │    │
│  │ │  - Webhooks  │  │ - High-res Delivery    │   │    │
│  │ └──────────────┘  └────────────────────────┘   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└──────────────────────────────────────────────────────────┘
                           ↓
              ┌────────────────────────────┐
              │   Vercel CDN & Hosting     │
              │  - Edge-deployed static    │
              │  - Serverless functions    │
              │    (webhooks, auth future) │
              └────────────────────────────┘
```

### **8.2 Data Flow**

#### **Order Creation Flow**
```
Student fills plate builder
       ↓
Clicks "Proceed to Checkout"
       ↓
Enters contact details
       ↓
Clicks "Proceed to Payment"
       ↓
Paystack modal (card/bank/USSD)
       ↓
Payment successful
       ↓
Paystack webhook → Vercel function (future)
       ↓
Order document created in Firestore
  {
    orderId, studentName, hostel, plates, 
    total, paymentStatus, orderStatus
  }
       ↓
Admin dashboard real-time listener fires
       ↓
Admin sees hostel batch "Ready for Dispatch"
       ↓
Admin clicks "Dispatch"
       ↓
Rider receives notification
       ↓
Rider marks "Picked Up" & "Delivered"
       ↓
Student sees real-time progress
       ↓
Order complete; earnings recorded
```

---

## 9. Success Metrics & KPIs

### **9.1 Business Metrics**
| Metric | Target (6 months) | Measurement |
|--------|-------------------|------------|
| Monthly Active Users | 2,000+ | Unique users placing orders |
| Orders Per Day Per Campus | 80+ | Total orders across all hostels |
| Average Order Value | ₦3,500 | Mean order total |
| Monthly Revenue | ₦4.2M | (Orders × Avg Order Value) |
| Customer Retention Rate | 40% | % returning within 30 days |
| Net Promoter Score (NPS) | 50+ | Student satisfaction survey |

### **9.2 Operational Metrics**
| Metric | Target | Measurement |
|--------|--------|------------|
| Delivery Time (P95) | 10 minutes | Time from order to delivery |
| Order Accuracy | 99.5% | Correct items delivered |
| Payment Success Rate | 98% | % of checkout attempts that succeed |
| Page Load Time | < 3s | Lighthouse score > 85 |
| Uptime | 99.5% | System availability |
| Rider Completion Rate | 95% | % orders completed on day assigned |

### **9.3 Quality Metrics**
| Metric | Target | Measurement |
|--------|--------|------------|
| Bug Report Rate | < 5/month | Critical production issues |
| Code Test Coverage | 60%+ | Unit + integration tests |
| Accessibility Score | WCAG AA | Automated tools + manual audit |
| Mobile Responsiveness | 100% | All breakpoints functional |

---

## 10. Roadmap & Launch Plan

### **Phase 1: Launch (April 2026)**
- ✅ Payment integration (Paystack)
- ✅ Plate builder & customization
- ✅ Order tracking
- ✅ Admin hostel-batching dashboard
- ✅ Rider order management
- ✅ Legal pages & support

### **Phase 2: Enhancement (June 2026)**
- User accounts & order history
- Saved favorite meals
- Analytics dashboard improvements
- Rider ratings & reviews
- Multi-cafeteria admin management

### **Phase 3: Expansion (August 2026)**
- Native mobile app (iOS/Android)
- Advanced scheduling (pre-order meals)
- Loyalty program & referrals
- Merchandise (CalebDeck branded items)
- Integration with student ID systems

### **Phase 4: Scale (October 2026+)**
- Multi-campus rollout
- International payment methods
- Admin API for campus ERP integration
- WhatsApp bot for order updates
- ML-based demand forecasting

---

## 11. Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Payment processor downtime** | Students can't pay | Low | Integrate backup processor (Stripe/2Checkout) |
| **Rider unavailability** | Orders stuck in transit | Medium | Hire 2–3 backup riders per campus |
| **Server outages** | Platform unavailable | Low | 99.5% SLA with Vercel; daily backups |
| **Food quality complaints** | Brand damage | Medium | Clear delivery time guarantees; admin quality checks |
| **Low adoption** | Insufficient orders | Medium | Launch with incentives (first-order discounts); student ambassadors |
| **Data privacy breach** | Legal/reputation damage | Low | PCI DSS compliance; regular security audits |
| **Cafeteria resistance** | Operational friction | Low | Clear revenue sharing; white-glove onboarding |

---

## 12. Conclusion

**CalebDeck** addresses a real, high-frequency pain point for campus students: the inefficiency of traditional cafeteria queues. By introducing intelligent batching, direct-to-hostel delivery, and real-time tracking, CalebDeck delivers a premium service that saves students 30–45 minutes per meal while maintaining food quality and reducing operational friction for cafeterias.

The platform is built on a scalable, modern tech stack (React + Firestore) with a premium design system that reinforces brand positioning. The product is production-ready as of April 2026, with clear pathways for expansion to multi-campus operation and native mobile apps.

The success of CalebDeck depends on:
1. Flawless execution of the core ordering + delivery flow
2. Strong adoption incentives during launch
3. Consistent, reliable delivery performance
4. Continuous feedback loops with students & admins

With disciplined execution and market focus on a single campus, CalebDeck is positioned to become the de-facto food delivery standard for Nigerian campuses.

---

**Document Updated:** February 26, 2026  
**Author:** CalebDeck Product Team  
**Status:** Ready for Stakeholder Review
