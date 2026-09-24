import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import ModPage from "./pages/ModPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import UserSettings from "./pages/UserSettings";
import NewMod from "./pages/NewMod";
import ProjectSettings from "./pages/ProjectSettings";
import UserPage from "./pages/UserPage";
import GamePage from "./pages/GamePage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Guidelines from "./pages/Guidelines";
import NotFound from "./pages/NotFound";

function Layout() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <Nav />
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
}

// Data router (instead of <BrowserRouter> + <Routes>) so pages can use
// useBlocker to guard against losing unsaved changes.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/mods/:slug", element: <ModPage /> },
      {
        path: "/mods/:slug/settings",
        element: (
          <ProtectedRoute>
            <ProjectSettings />
          </ProtectedRoute>
        ),
      },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/users/:id", element: <UserPage /> },
      { path: "/games/:gameSlug", element: <GamePage /> },
      { path: "/games/:gameSlug/:projectSlug", element: <ModPage /> },
      { path: "/terms", element: <Terms /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/rules", element: <Guidelines /> },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/settings",
        element: (
          <ProtectedRoute>
            <UserSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: "/mods/new",
        element: (
          <ProtectedRoute>
            <NewMod />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin",
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;