import { createBrowserRouter, Outlet } from "react-router";
import { AdminRoleWrapper, RiderRoleWrapper } from './layouts/RoleWrappers';
import StudentRoleWrapper from './layouts/StudentRoleWrapper';

import LandingPage from "./pages/student/LandingPage";
import CafeteriaSelection from "./pages/student/CafeteriaSelection";
import PlateBuilder from "./pages/student/PlateBuilder";
import Checkout from "./pages/student/Checkout";
import OrderSuccess from "./pages/student/OrderSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Support from "./pages/Support";
import LearnMore from "./pages/LearnMore";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import RiderManagement from "./pages/admin/RiderManagement";
import MenuManagement from "./pages/admin/MenuManagement";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminOrderHistory from "./pages/admin/AdminOrderHistory";
import AdminSetup from "./pages/admin/AdminSetup";

import RiderLogin from "./pages/rider/RiderLogin";
import RiderDashboard from "./pages/rider/RiderDashboard";
import RiderOrderHistory from "./pages/rider/RiderOrderHistory";
import RiderBatchDetails from "./pages/rider/RiderBatchDetails";
import RiderBatches from "./pages/rider/RiderBatches";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
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
