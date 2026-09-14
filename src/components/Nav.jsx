import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function Nav() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  // Close the menu when navigating via the logo while open is handled
  // by the menu links themselves; the menu also closes on outside click.

  async function logout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  }

  const displayName =
    profile?.display_name?.trim() ||
    profile?.username ||
    user?.email ||
    "Account";
  const initial = (
    profile?.display_name?.trim() ||
    profile?.username ||
    user?.email ||
    "?"
  )
    .charAt(0)
    .toUpperCase();

  const menuItemClass =
    "block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white";

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <Link to="/" className="text-lg font-bold text-white">
        FrostWolf
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              title={displayName}
              className="flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-white">
                  {initial}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-lg"
              >
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="truncate text-sm font-medium text-white">
                    {displayName}
                  </p>
                  {profile?.username && user.email && (
                    <p className="truncate text-xs text-zinc-500">
                      {user.email}
                    </p>
                  )}
                </div>
                <div className="py-1">
                  <Link
                    to={`/users/${user.id}`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={menuItemClass}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={menuItemClass}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={menuItemClass}
                  >
                    User settings
                  </Link>
                </div>
                <div className="border-t border-zinc-800 py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className={menuItemClass}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
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