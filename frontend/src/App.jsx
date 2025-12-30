import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RequireGuest from "./routes/guards/RequireGuest.jsx";
import RequireAuthentication from "./routes/guards/RequireAuth.jsx";
import RequireAdmin from "./routes/guards/RequireAdmin.jsx";

import RootLayout from "./pages/Root.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import EventDetailsPage from "./pages/EventDetailsPage.jsx";

import AuthLayout from "./auth/layouts/AuthLayout.jsx";
import LoginPage from "./auth/pages/LoginPage";
import RegisterPage from "./auth/pages/RegisterPage";
import AdminLoginPage from "./auth/pages/AdminLogin";
import ForgotPasswordPage from "./auth/pages/ForgotPassword.jsx";

import AdminDashboard from "./admin/pages/AdminDashboard.jsx";

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
        element: <EventsPage />,
        path: "events/:category",
      },
      {
        element: <EventDetailsPage />,
        path: "events/:category/:eventId",
      },
      {
        element: (
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        ),
        path: "admin/dashboard",
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
