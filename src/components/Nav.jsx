import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function Nav() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <Link to="/" className="text-lg font-bold text-white">
        FrostWolf
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link to="/dashboard" className="text-zinc-300 hover:text-white">
              Dashboard
            </Link>
            <Link
              to="/dashboard"
              title={profile?.username ?? user.email}
              className="flex items-center"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username ?? "Avatar"}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-white">
                  {(profile?.username ?? user.email ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </Link>
            <button
              onClick={logout}
              className="text-zinc-300 hover:text-white"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-zinc-300 hover:text-white">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Nav;