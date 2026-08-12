import { createBrowserRouter, Outlet } from "react-router";
import { Suspense, lazy } from 'react';
import { AdminRoleWrapper, RiderRoleWrapper } from './layouts/RoleWrappers';
import StudentRoleWrapper from './layouts/StudentRoleWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootWrapper } from './components/RootWrapper';

// --- Lazy Load Student Pages ---
const LandingPage = lazy(() => import("./pages/student/LandingPage"));
const CafeteriaSelection = lazy(() => import("./pages/student/CafeteriaSelection"));
const PlateBuilder = lazy(() => import("./pages/student/PlateBuilder"));
const Checkout = lazy(() => import("./pages/student/Checkout"));
const OrderSuccess = lazy(() => import("./pages/student/OrderSuccess"));
const MartPage = lazy(() => import("./pages/student/MartPage"));
const MartCart = lazy(() => import("./pages/student/MartCart"));
const MartCheckout = lazy(() => import("./pages/student/MartCheckout"));

// --- Lazy Load Fashion Pages ---
const FashionPage = lazy(() => import("./pages/student/FashionPage"));
const FashionPDP = lazy(() => import("./pages/student/FashionPDP"));
const FashionCheckout = lazy(() => import("./pages/student/FashionCheckout"));

// --- Lazy Load Info & Legal Pages ---
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const LearnMore = lazy(() => import("./pages/LearnMore"));

// --- Lazy Load Admin Pages ---
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const RiderManagement = lazy(() => import("./pages/admin/RiderManagement"));
const MenuManagement = lazy(() => import("./pages/admin/MenuManagement"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminOrderHistory = lazy(() => import("./pages/admin/AdminOrderHistory"));
const AdminSetup = lazy(() => import("./pages/admin/AdminSetup"));
const SeedData = lazy(() => import("./pages/admin/SeedData"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminMartInventory = lazy(() => import("./pages/admin/AdminMartInventory"));
const AdminMartOrders = lazy(() => import("./pages/admin/AdminMartOrders"));
const AdminFashion = lazy(() => import("./pages/admin/AdminFashion"));

// --- Lazy Load Rider Pages ---
const RiderLogin = lazy(() => import("./pages/rider/RiderLogin"));
const RiderDashboard = lazy(() => import("./pages/rider/RiderDashboard"));
const RiderOrderHistory = lazy(() => import("./pages/rider/RiderOrderHistory"));
const RiderBatchDetails = lazy(() => import("./pages/rider/RiderBatchDetails"));
const RiderBatches = lazy(() => import("./pages/rider/RiderBatches"));
const RiderWallet = lazy(() => import("./pages/rider/RiderWallet"));

const SuspenseFallback = () => (
  <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#121212] flex flex-col items-center justify-center gap-5">
    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
      <img src="/calebdeck-logo.jpeg" alt="CalebDeck" className="w-full h-full object-cover" />
    </div>
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Loading CalebDeck...</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <Suspense fallback={<SuspenseFallback />}>
          <RootWrapper />
        </Suspense>
      </ErrorBoundary>
    ),
    children: [
      /* Student Flow */
      {
        path: "/",
        element: <StudentRoleWrapper />,
        children: [
          { index: true, Component: LandingPage },
          { path: "cafeteria", Component: CafeteriaSelection },
          { path: "plate-builder/:cafeteriaId", Component: PlateBuilder },
          { path: "checkout", Component: Checkout },
          { path: "order-success", Component: OrderSuccess },
          { path: "mart", Component: MartPage },
          { path: "mart/cart", Component: MartCart },
          { path: "mart/checkout", Component: MartCheckout },
          { path: "fashion", lazy: () => import("./pages/student/FashionPage").then(m => ({ Component: m.default })) },
          { path: "fashion/product/:id", lazy: () => import("./pages/student/FashionPDP").then(m => ({ Component: m.default })) },
          { path: "fashion/checkout", lazy: () => import("./pages/student/FashionCheckout").then(m => ({ Component: m.default })) },
          { path: "calebnet", lazy: () => import("./pages/student/CalebNet").then(m => ({ Component: m.default })) },
          { path: "calebnet/status/:paymentReference", lazy: () => import("./pages/student/CalebNetStatus").then(m => ({ Component: m.default })) },
          { path: "my-orders", lazy: () => import("./pages/student/MyOrders").then(m => ({ Component: m.default })) },
          { path: "profile", lazy: () => import("./pages/student/Profile").then(m => ({ Component: m.default })) },
          { path: "wallet", lazy: () => import("./pages/student/WalletPage").then(m => ({ Component: m.default })) },
        ]
      },

      /* Admin Flow */
      { path: "/admin/login", Component: AdminLogin },
      { path: "/admin/setup", Component: AdminSetup },
      {
        path: "/admin",
        element: <AdminRoleWrapper />,
        children: [
          { index: true, Component: AdminDashboard },
          { path: "orders", Component: AdminOrders },
          { path: "riders", Component: RiderManagement },
          { path: "menu", Component: MenuManagement },
          { path: "analytics", Component: AdminAnalytics },
          { path: "history", Component: AdminOrderHistory },
          { path: "reviews", Component: AdminReviews },
          { path: "directory", lazy: () => import('./pages/admin/AdminDirectory').then(m => ({ Component: m.default })) },
          { path: "settings", lazy: () => import('./pages/admin/AdminSettings').then(m => ({ Component: m.default })) },
          { path: "seed", Component: SeedData },
          { path: "mart/inventory", Component: AdminMartInventory },
          { path: "mart/orders", Component: AdminMartOrders },
          { path: "fashion", lazy: () => import("./pages/admin/AdminFashion").then(m => ({ Component: m.default })) },
          { path: "calebnet", lazy: () => import('./pages/admin/AdminCalebNet').then(m => ({ Component: m.default })) },
          { path: "batches", lazy: () => import('./pages/admin/AdminBatchManager').then(m => ({ Component: m.default })) },
        ]
      },

      /* Rider Flow */
      { path: "/rider/login", Component: RiderLogin },
      { path: "/rider/signup", element: <RiderLogin initialMode="signup" /> },
      {
        path: "/rider",
        element: <RiderRoleWrapper />,
        children: [
          { index: true, Component: RiderDashboard },
          { path: "history", Component: RiderOrderHistory },
          { path: "wallet", Component: RiderWallet },
          { path: "analytics", lazy: () => import('./pages/rider/RiderAnalytics').then(m => ({ Component: m.default })) },
          { path: "batch/:batchId", Component: RiderBatchDetails },
          { path: "batches", Component: RiderBatches },
        ]
      },

      /* Legal & info pages */
      { path: "/privacy", Component: PrivacyPolicy },
      { path: "/terms", Component: TermsOfService },
      { path: "/support", Component: Support },
      { path: "/learn-more", Component: LearnMore },
      { path: "/calebdeck-mart", lazy: () => import("./pages/CalebDeckMartLanding").then(m => ({ Component: m.default })) },
      { path: "/calebnet-info", lazy: () => import("./pages/CalebNetLanding").then(m => ({ Component: m.default })) },
    ]
  },
]);
