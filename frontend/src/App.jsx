import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RequireGuest from "./routes/guards/RequireGuest.jsx";
import RequireAdmin from "./routes/guards/RequireAdmin.jsx";
import RequireAuth from "./routes/guards/RequireAuth.jsx";

import RootLayout from "./pages/Root.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import EventDetailsPage from "./pages/EventDetailsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

import AuthLayout from "./auth/layouts/AuthLayout.jsx";
import LoginPage from "./auth/pages/LoginPage";
import RegisterPage from "./auth/pages/RegisterPage";
import AdminLoginPage from "./auth/pages/AdminLogin";
import ForgotPasswordPage from "./auth/pages/ForgotPassword.jsx";

import AdminLayout from "./admin/layouts/AdminLayout.jsx";
import DashboardPage from "./admin/pages/DashboardPage.jsx";
import UsersPage from "./admin/pages/UsersPage.jsx";
import EventsPageAdmin from "./admin/pages/EventsPage.jsx";
import CategoriesPage from "./admin/pages/CategoriesPage.jsx";
import DeviceLogsPage from "./admin/pages/DeviceLogsPage.jsx";
import AdminLogsPage from "./admin/pages/AdminLogsPage.jsx";
import EventChangeLogsPage from "./admin/pages/EventChangeLogsPage.jsx";
import IncidentsPage from "./admin/pages/IncidentsPage.jsx";
import IPBlocksPage from "./admin/pages/IPBlocksPage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <div>404 Not Found</div>,
    children: [
      { index: true, element: <LandingPage /> },
      {
        element: (
          <RequireGuest>
            <AuthLayout />
          </RequireGuest>
        ),
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "admin-login", element: <AdminLoginPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      {
        path: "events/:categorySlug",
        element: <EventsPage />,
      },
      {
        path: "events/:categorySlug/:eventSlug",
        element: <EventDetailsPage />,
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "events", element: <EventsPageAdmin /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "logs/device", element: <DeviceLogsPage /> },
          { path: "logs/admin", element: <AdminLogsPage /> },
          { path: "logs/event-changes", element: <EventChangeLogsPage /> },
          { path: "security/incidents", element: <IncidentsPage /> },
          { path: "security/blocks", element: <IPBlocksPage /> },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
