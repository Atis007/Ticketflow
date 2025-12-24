import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RootLayout from "./pages/Root.jsx";
import LandingPage from "./pages/LandingPage.jsx";


import EventsPage from "./pages/EventsPage.jsx";
import EventDetailsPage from "./pages/EventDetailsPage.jsx";

import AuthLayout from "./auth/layouts/AuthLayout.jsx";
import LoginPage from "./auth/pages/LoginPage";
import RegisterPage from "./auth/pages/RegisterPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <div>404 Not Found</div>,
    children: [
      { index: true, element: <LandingPage /> },
      {
        element: <AuthLayout />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        path: "events/:category",
        element: <EventsPage />,
      },
      {
        path: "events/:category/:eventId",
        element: <EventDetailsPage />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
