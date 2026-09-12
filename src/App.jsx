import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Nav from "./components/Nav";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import ModPage from "./pages/ModPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NewMod from "./pages/NewMod";
import ProjectSettings from "./pages/ProjectSettings";
import UserPage from "./pages/UserPage";
import GamePage from "./pages/GamePage";

function App() {
  return (
    <AuthProvider>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mods/:slug" element={<ModPage />} />
        <Route
          path="/mods/:slug/settings"
          element={
            <ProtectedRoute>
              <ProjectSettings />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/users/:id" element={<UserPage />} />
        <Route path="/games/:gameSlug" element={<GamePage />} />
        <Route path="/games/:gameSlug/:projectSlug" element={<ModPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mods/new"
          element={
            <ProtectedRoute>
              <NewMod />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;