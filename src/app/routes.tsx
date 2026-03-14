import { createBrowserRouter, Outlet } from "react-router";
import { Suspense, lazy } from 'react';
import { AdminRoleWrapper, RiderRoleWrapper } from './layouts/RoleWrappers';
import StudentRoleWrapper from './layouts/StudentRoleWrapper';

// --- Lazy Load Student Pages ---
const LandingPage = lazy(() => import("./pages/student/LandingPage"));
const CafeteriaSelection = lazy(() => import("./pages/student/CafeteriaSelection"));
const PlateBuilder = lazy(() => import("./pages/student/PlateBuilder"));
const Checkout = lazy(() => import("./pages/student/Checkout"));
const OrderSuccess = lazy(() => import("./pages/student/OrderSuccess"));

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

// --- Lazy Load Rider Pages ---
const RiderLogin = lazy(() => import("./pages/rider/RiderLogin"));
const RiderDashboard = lazy(() => import("./pages/rider/RiderDashboard"));
const RiderOrderHistory = lazy(() => import("./pages/rider/RiderOrderHistory"));
const RiderBatchDetails = lazy(() => import("./pages/rider/RiderBatchDetails"));
const RiderBatches = lazy(() => import("./pages/rider/RiderBatches"));

const SuspenseFallback = () => (
  <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <Outlet />
      </Suspense>
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
          { path: "seed", Component: SeedData },
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
    ]
  },
]);
