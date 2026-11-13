import { createBrowserRouter } from "react-router";
import { Suspense } from 'react';
import { AdminRoleWrapper, RiderRoleWrapper } from './layouts/RoleWrappers';
import StudentRoleWrapper from './layouts/StudentRoleWrapper';
import { IconGate } from './layouts/IconGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary, FriendlyErrorFallback } from './components/RouteErrorBoundary';
import { DiscontinuedServicePage } from './components/DiscontinuedServicePage';
import { RootWrapper } from './components/RootWrapper';
import { lazyWithRetry, lazyRoute, installVitePreloadErrorHandler } from '../utils/lazyWithRetry';

installVitePreloadErrorHandler();

// --- Lazy Load Student Pages ---
const LandingPage = lazyWithRetry(() => import("./pages/student/LandingPage"), "LandingPage");
const CafeteriaSelection = lazyWithRetry(() => import("./pages/student/CafeteriaSelection"), "CafeteriaSelection");
const PlateBuilder = lazyWithRetry(() => import("./pages/student/PlateBuilder"), "PlateBuilder");
const Checkout = lazyWithRetry(() => import("./pages/student/Checkout"), "Checkout");
const OrderSuccess = lazyWithRetry(() => import("./pages/student/OrderSuccess"), "OrderSuccess");

const MartDiscontinuedElement = (
  <DiscontinuedServicePage
    serviceName="CalebDeck Mart"
    description="CalebDeck Mart (groceries and essentials) has been discontinued as we focus on weekend campus food delivery and CalebDeck Fashion."
  />
);
const CalebNetDiscontinuedElement = (
  <DiscontinuedServicePage
    serviceName="CalebNet"
    description="CalebNet (Airtime & Data top-up) has been discontinued and is no longer accepting new transactions."
  />
);

// --- Lazy Load Fashion Pages ---
const FashionPage = lazyWithRetry(() => import("./pages/student/FashionPage"), "FashionPage");
const FashionPDP = lazyWithRetry(() => import("./pages/student/FashionPDP"), "FashionPDP");
const FashionCheckout = lazyWithRetry(() => import("./pages/student/FashionCheckout"), "FashionCheckout");

// --- Lazy Load Info & Legal Pages ---
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"), "PrivacyPolicy");
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"), "TermsOfService");
const Support = lazyWithRetry(() => import("./pages/Support"), "Support");
const LearnMore = lazyWithRetry(() => import("./pages/LearnMore"), "LearnMore");

// --- Lazy Load Admin Pages ---
const AdminLogin = lazyWithRetry(() => import("./pages/admin/AdminLogin"), "AdminLogin");
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"), "AdminDashboard");
const AdminOrders = lazyWithRetry(() => import("./pages/admin/AdminOrders"), "AdminOrders");
const RiderManagement = lazyWithRetry(() => import("./pages/admin/RiderManagement"), "RiderManagement");
const MenuManagement = lazyWithRetry(() => import("./pages/admin/MenuManagement"), "MenuManagement");
const AdminAnalytics = lazyWithRetry(() => import("./pages/admin/AdminAnalytics"), "AdminAnalytics");
const AdminOrderHistory = lazyWithRetry(() => import("./pages/admin/AdminOrderHistory"), "AdminOrderHistory");
const AdminSetup = lazyWithRetry(() => import("./pages/admin/AdminSetup"), "AdminSetup");
const SeedData = lazyWithRetry(() => import("./pages/admin/SeedData"), "SeedData");
const AdminReviews = lazyWithRetry(() => import("./pages/admin/AdminReviews"), "AdminReviews");
const AdminMartInventory = lazyWithRetry(() => import("./pages/admin/AdminMartInventory"), "AdminMartInventory");
const AdminMartOrders = lazyWithRetry(() => import("./pages/admin/AdminMartOrders"), "AdminMartOrders");
const AdminFashion = lazyWithRetry(() => import("./pages/admin/AdminFashion"), "AdminFashion");
const AdminFashionOrders = lazyWithRetry(() => import("./pages/admin/AdminFashionOrders"), "AdminFashionOrders");

// --- Lazy Load Rider Pages ---
const RiderLogin = lazyWithRetry(() => import("./pages/rider/RiderLogin"), "RiderLogin");
const RiderDashboard = lazyWithRetry(() => import("./pages/rider/RiderDashboard"), "RiderDashboard");
const RiderOrderHistory = lazyWithRetry(() => import("./pages/rider/RiderOrderHistory"), "RiderOrderHistory");
const RiderBatchDetails = lazyWithRetry(() => import("./pages/rider/RiderBatchDetails"), "RiderBatchDetails");
const RiderBatches = lazyWithRetry(() => import("./pages/rider/RiderBatches"), "RiderBatches");
const RiderWallet = lazyWithRetry(() => import("./pages/rider/RiderWallet"), "RiderWallet");

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
    errorElement: <RouteErrorBoundary />,
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
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, Component: LandingPage },
          { path: "cafeteria", Component: CafeteriaSelection },
          { path: "plate-builder/:cafeteriaId", Component: PlateBuilder },
          { path: "checkout", Component: Checkout },
          { path: "order-success", Component: OrderSuccess },
          { path: "mart", element: MartDiscontinuedElement },
          { path: "cart", element: MartDiscontinuedElement },
          { path: "mart/checkout", element: MartDiscontinuedElement },
          { path: "calebnet", element: CalebNetDiscontinuedElement },
          { path: "calebnet/status/:paymentReference", lazy: lazyRoute(() => import("./pages/student/CalebNetStatus"), "CalebNetStatus") },
          { path: "my-orders", lazy: lazyRoute(() => import("./pages/student/MyOrders"), "MyOrders") },
          
          { path: "business", lazy: lazyRoute(() => import("./pages/student/BusinessPage"), "BusinessPage") },
          { path: "business/product/:id", lazy: lazyRoute(() => import("./pages/student/BusinessProductPage"), "BusinessProductPage") },
          { path: "business/dashboard", lazy: lazyRoute(() => import("./pages/student/VendorDashboard"), "VendorDashboard") },
          { path: "business/activate/:token", lazy: lazyRoute(() => import("./pages/student/VendorActivation"), "VendorActivation") },
          
          { path: "fashion", Component: FashionPage },
          { path: "fashion/product/:id", Component: FashionPDP },
          { path: "fashion/checkout", Component: FashionCheckout },
          
          /* ICON-Only Routes */
          {
            path: "",
            element: <IconGate />,
            errorElement: <RouteErrorBoundary />,
            children: [
              { path: "profile", lazy: lazyRoute(() => import("./pages/student/Profile"), "Profile") },
              { path: "wallet", lazy: lazyRoute(() => import("./pages/student/WalletPage"), "WalletPage") },
            ]
          }
        ]
      },

      /* Admin Flow */
      { path: "/admin/login", Component: AdminLogin, errorElement: <RouteErrorBoundary /> },
      { path: "/admin/setup", Component: AdminSetup, errorElement: <RouteErrorBoundary /> },
      {
        path: "/admin",
        element: <AdminRoleWrapper />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, Component: AdminDashboard },
          { path: "monitoring", lazy: lazyRoute(() => import('./pages/admin/AdminMonitoring'), "AdminMonitoring") },
          { path: "orders", Component: AdminOrders },
          { path: "riders", Component: RiderManagement },
          { path: "menu", Component: MenuManagement },
          { path: "analytics", Component: AdminAnalytics },
          { path: "history", Component: AdminOrderHistory },
          { path: "reviews", Component: AdminReviews },
          { path: "directory", lazy: lazyRoute(() => import('./pages/admin/AdminDirectory'), "AdminDirectory") },
          { path: "settings", lazy: lazyRoute(() => import('./pages/admin/AdminSettings'), "AdminSettings") },
          { path: "seed", Component: SeedData },
          { path: "mart/inventory", Component: AdminMartInventory },
          { path: "mart/orders", Component: AdminMartOrders },
          { path: "fashion", Component: AdminFashion },
          { path: "fashion/orders", Component: AdminFashionOrders },
          { path: "calebnet", lazy: lazyRoute(() => import('./pages/admin/AdminCalebNet'), "AdminCalebNet") },
          { path: "batches", lazy: lazyRoute(() => import('./pages/admin/AdminBatchManager'), "AdminBatchManager") },
          { path: "business", lazy: lazyRoute(() => import('./pages/admin/AdminBusiness'), "AdminBusiness") },
        ]
      },

      /* Rider Flow */
      { path: "/rider/login", Component: RiderLogin, errorElement: <RouteErrorBoundary /> },
      { path: "/rider/signup", element: <RiderLogin initialMode="signup" />, errorElement: <RouteErrorBoundary /> },
      {
        path: "/rider",
        element: <RiderRoleWrapper />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, Component: RiderDashboard },
          { path: "history", Component: RiderOrderHistory },
          { path: "wallet", Component: RiderWallet },
          { path: "analytics", lazy: lazyRoute(() => import('./pages/rider/RiderAnalytics'), "RiderAnalytics") },
          { path: "batch/:batchId", Component: RiderBatchDetails },
          { path: "batches", Component: RiderBatches },
        ]
      },

      /* Legal & info pages */
      { path: "/privacy", Component: PrivacyPolicy },
      { path: "/terms", Component: TermsOfService },
      { path: "/support", Component: Support },
      { path: "/learn-more", Component: LearnMore },
      { path: "/calebdeck-mart", element: MartDiscontinuedElement },
      { path: "/calebnet-info", element: CalebNetDiscontinuedElement },
      { path: "*", element: <FriendlyErrorFallback error={{ status: 404 }} /> },
    ]
  },
]);
