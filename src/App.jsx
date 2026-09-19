import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Nav from "./components/Nav";
import ProtectedRoute from "./components/ProtectedRoute";
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

function Layout() {
  return (
    <AuthProvider>
      <Nav />
      <Outlet />
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
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;