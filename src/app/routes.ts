import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import StudentRoleWrapper from './layouts/StudentRoleWrapper';
import { AdminRoleWrapper, RiderRoleWrapper } from './layouts/RoleWrappers';
import LandingPage from './pages/student/LandingPage';
import CafeteriaSelection from './pages/student/CafeteriaSelection';
import PlateBuilder from './pages/student/PlateBuilder';
import Checkout from './pages/student/Checkout';
import OrderSuccess from './pages/student/OrderSuccess';
import AdminDashboard from './pages/admin/AdminDashboard';
import RiderDashboard from './pages/rider/RiderDashboard';
import SeedData from './pages/admin/SeedData';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        path: '/',
        Component: StudentRoleWrapper,
        children: [
          {
            index: true,
            Component: LandingPage,
          },
          {
            path: 'cafeteria',
            Component: CafeteriaSelection,
          },
          {
            path: 'plate-builder',
            Component: PlateBuilder,
          },
          {
            path: 'checkout',
            Component: Checkout,
          },
          {
            path: 'order-success',
            Component: OrderSuccess,
          },
        ]
      },
      {
        path: '/admin',
        Component: AdminRoleWrapper,
        children: [
          {
            index: true,
            Component: AdminDashboard,
          },
          {
            path: 'seed',
            Component: SeedData,
          }
        ]
      },
      {
        path: '/rider',
        Component: RiderRoleWrapper,
        children: [
          {
            index: true,
            Component: RiderDashboard,
          }
        ]
      },
      {
        path: '/seed',
        Component: SeedData,
      }
    ]
  }
]);