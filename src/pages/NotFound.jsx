import { Link, useLocation, useNavigate } from "react-router-dom";
import FrostWolfLogo from "../components/FrostWolfLogo";

function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center sm:py-24">
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden
          className="absolute h-40 w-40 rounded-full bg-blue-600/15 blur-3xl"
        />
        <FrostWolfLogo className="relative h-20 w-20 opacity-90" />
      </div>

      <p className="mt-8 font-mono text-sm font-medium tracking-widest text-sky-400">
        404
      </p>
      <h1 className="mt-2 text-4xl font-bold text-white sm:text-5xl">
        Lost in the snow?
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
        This trail went cold — the page you&apos;re looking for doesn&apos;t
        exist, was moved, or was never here.
      </p>

      {location.pathname && location.pathname !== "/" ? (
        <p className="mt-4 max-w-full truncate rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-500">
          {location.pathname}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Back to home
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
        >
          Go back
        </button>
      </div>
    </div>
  );
}

export default NotFound;
