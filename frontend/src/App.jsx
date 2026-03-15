import { lazy, Suspense } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RequireGuest from "./routes/guards/RequireGuest.jsx";
import RequireAdmin from "./routes/guards/RequireAdmin.jsx";
import RequireAuth from "./routes/guards/RequireAuth.jsx";
import RequireVerified from "./routes/guards/RequireVerified.jsx";

import RootLayout from "./pages/Root.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import PageLoader from "./components/PageLoader.jsx";

const EventDetailsPage = lazy(() => import("./pages/EventDetailsPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

const AuthLayout = lazy(() => import("./auth/layouts/AuthLayout.jsx"));
const LoginPage = lazy(() => import("./auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("./auth/pages/RegisterPage"));
const AdminLoginPage = lazy(() => import("./auth/pages/AdminLogin"));
const ForgotPasswordPage = lazy(() =>
  import("./auth/pages/ForgotPassword.jsx")
);
const ResetPasswordPage = lazy(() =>
  import("./auth/pages/ResetPasswordPage.jsx")
);
const VerifyEmailPage = lazy(() => import("./auth/pages/VerifyEmailPage.jsx"));

const CreateEventPage = lazy(() => import("./pages/CreateEventPage.jsx"));
const MyTicketsPage = lazy(() => import("./pages/MyTicketsPage.jsx"));
const ArchivePage = lazy(() => import("./pages/ArchivePage.jsx"));

const AdminLayout = lazy(() => import("./admin/layouts/AdminLayout.jsx"));
const DashboardPage = lazy(() => import("./admin/pages/DashboardPage.jsx"));
const UsersPage = lazy(() => import("./admin/pages/UsersPage.jsx"));
const EventsPageAdmin = lazy(() => import("./admin/pages/EventsPage.jsx"));
const CategoriesPage = lazy(() => import("./admin/pages/CategoriesPage.jsx"));
const DeviceLogsPage = lazy(() => import("./admin/pages/DeviceLogsPage.jsx"));
const AdminLogsPage = lazy(() => import("./admin/pages/AdminLogsPage.jsx"));
const EventChangeLogsPage = lazy(() =>
  import("./admin/pages/EventChangeLogsPage.jsx")
);
const IncidentsPage = lazy(() => import("./admin/pages/IncidentsPage.jsx"));
const IPBlocksPage = lazy(() => import("./admin/pages/IPBlocksPage.jsx"));
const AnalyticsPage = lazy(() => import("./admin/pages/AnalyticsPage.jsx"));
const loader = <PageLoader />;

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
            <Suspense fallback={loader}>
              <AuthLayout />
            </Suspense>
          </RequireGuest>
        ),
        children: [
          {
            path: "login",
            element: (
              <Suspense fallback={loader}>
                <LoginPage />
              </Suspense>
            ),
          },
          {
            path: "register",
            element: (
              <Suspense fallback={loader}>
                <RegisterPage />
              </Suspense>
            ),
          },
          {
            path: "admin-login",
            element: (
              <Suspense fallback={loader}>
                <AdminLoginPage />
              </Suspense>
            ),
          },
          {
            path: "forgot-password",
            element: (
              <Suspense fallback={loader}>
                <ForgotPasswordPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "events",
        element: <EventsPage />,
      },
      {
        path: "events/:categorySlug",
        element: <EventsPage />,
      },
      {
        path: "events/:categorySlug/:eventSlug",
        element: (
          <RequireVerified>
            <Suspense fallback={loader}>
              <EventDetailsPage />
            </Suspense>
          </RequireVerified>
        ),
      },
      {
        path: "reset-password",
        element: (
          <Suspense fallback={loader}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
      {
        path: "verify-email",
        element: (
          <Suspense fallback={loader}>
            <VerifyEmailPage />
          </Suspense>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <Suspense fallback={loader}>
              <ProfilePage />
            </Suspense>
          </RequireAuth>
        ),
      },
      {
        path: "create-event",
        element: (
          <RequireAuth>
            <Suspense fallback={loader}>
              <CreateEventPage />
            </Suspense>
          </RequireAuth>
        ),
      },
      {
        path: "dashboard/tickets",
        element: (
          <RequireAuth>
            <Suspense fallback={loader}>
              <MyTicketsPage />
            </Suspense>
          </RequireAuth>
        ),
      },
      {
        path: "dashboard/archive",
        element: (
          <RequireAuth>
            <Suspense fallback={loader}>
              <ArchivePage />
            </Suspense>
          </RequireAuth>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireAdmin>
            <Suspense fallback={loader}>
              <AdminLayout />
            </Suspense>
          </RequireAdmin>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={loader}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "dashboard",
            element: (
              <Suspense fallback={loader}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "users",
            element: (
              <Suspense fallback={loader}>
                <UsersPage />
              </Suspense>
            ),
          },
          {
            path: "events",
            element: (
              <Suspense fallback={loader}>
                <EventsPageAdmin />
              </Suspense>
            ),
          },
          {
            path: "categories",
            element: (
              <Suspense fallback={loader}>
                <CategoriesPage />
              </Suspense>
            ),
          },
          {
            path: "logs/device",
            element: (
              <Suspense fallback={loader}>
                <DeviceLogsPage />
              </Suspense>
            ),
          },
          {
            path: "logs/admin",
            element: (
              <Suspense fallback={loader}>
                <AdminLogsPage />
              </Suspense>
            ),
          },
          {
            path: "logs/event-changes",
            element: (
              <Suspense fallback={loader}>
                <EventChangeLogsPage />
              </Suspense>
            ),
          },
          {
            path: "security/incidents",
            element: (
              <Suspense fallback={loader}>
                <IncidentsPage />
              </Suspense>
            ),
          },
          {
            path: "security/blocks",
            element: (
              <Suspense fallback={loader}>
                <IPBlocksPage />
              </Suspense>
            ),
          },
          {
            path: "analytics",
            element: (
              <Suspense fallback={loader}>
                <AnalyticsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
