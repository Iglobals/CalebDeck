import { createBrowserRouter } from "react-router";
import Landing from "./pages/Landing";
import CafeteriaSelection from "./pages/CafeteriaSelection";
import PlateBuilder from "./pages/PlateBuilder";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import AdminDashboard from "./pages/AdminDashboard";
import RiderDashboard from "./pages/RiderDashboard";
import DesignSystem from "./pages/DesignSystem";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/cafeteria",
    Component: CafeteriaSelection,
  },
  {
    path: "/plate-builder/:cafeteriaId",
    Component: PlateBuilder,
  },
  {
    path: "/checkout",
    Component: Checkout,
  },
  {
    path: "/order/:orderId",
    Component: OrderTracking,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/rider",
    Component: RiderDashboard,
  },
  {
    path: "/design-system",
    Component: DesignSystem,
  },
]);
