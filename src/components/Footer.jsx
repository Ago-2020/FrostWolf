import { Link } from "react-router-dom";
import FrostWolfLogo from "./FrostWolfLogo";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <FrostWolfLogo className="h-6 w-6" />
            FrostWolf
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Find and share game mods. © {year} FrostWolf.
          </p>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-zinc-400 hover:text-white">
            Games
          </Link>
          <Link to="/dashboard" className="text-zinc-400 hover:text-white">
            Dashboard
          </Link>
          <Link to="/mods/new" className="text-zinc-400 hover:text-white">
            Share a mod
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
