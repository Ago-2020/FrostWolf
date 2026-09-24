import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProjectIcon from "../components/ProjectIcon";
import GameBanner from "../components/GameBanner";
import { VoteStars } from "../components/VoteButtons";

const MODS_PER_GAME = 3;

function Home() {
  const [games, setGames] = useState([]);
  const [topMods, setTopMods] = useState({});
  const [modCounts, setModCounts] = useState({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [modsLoading, setModsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("games")
      .select("id, name, slug, icon_url, banner_url, created_at")
      .then(({ data }) => {
        if (cancelled) return;
        const list = data ?? [];
        setGames(list);
        setLoading(false);
        if (list.length > 0) setModsLoading(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Most-liked mods per game ("mods liked by the people").
  useEffect(() => {
    if (games.length === 0) return;
    let cancelled = false;

    Promise.all(
      games.map(async (g) => {
        const { data, count } = await supabase
          .from("projects")
          .select(
            "id, name, slug, icon_url, summary, like_count, dislike_count",
            { count: "exact" }
          )
          .eq("game_id", g.id)
          .eq("status", "published")
          .eq("visibility", "public")
          .order("like_count", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(MODS_PER_GAME);
        return { gameId: g.id, mods: data ?? [], count: count ?? 0 };
      })
    ).then((results) => {
      if (cancelled) return;
      const modsByGame = {};
      const countsByGame = {};
      for (const r of results) {
        modsByGame[r.gameId] = r.mods;
        countsByGame[r.gameId] = r.count;
      }
      setTopMods(modsByGame);
      setModCounts(countsByGame);
      setModsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [games]);

  const q = search.trim().toLowerCase();
  const filteredGames = useMemo(() => {
    const filtered = q
      ? games.filter(
          (g) => g.name.toLowerCase().includes(q) || g.slug.includes(q)
        )
      : [...games];
    if (sort === "alpha") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0) ||
          a.name.localeCompare(b.name)
      );
    }
    return filtered;
  }, [games, q, sort]);

  const tabClass = (active) =>
    `rounded px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-zinc-800 text-white"
        : "text-zinc-500 hover:text-zinc-200"
    }`;

  return (
    <div>
      <section className="border-b border-zinc-800 bg-gradient-to-r from-blue-950 via-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="max-w-2xl text-4xl font-bold text-white">
            Find your next favorite mod
          </h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400">
            Browse games, discover community projects, and share your own mods
            with players.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#games"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Browse games
            </a>
            <Link
              to="/mods/new"
              className="rounded border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Share a mod
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Workshop-style toolbar: sort tabs left, search right */}
        <div className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/60 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSort("recent")}
              aria-pressed={sort === "recent"}
              className={tabClass(sort === "recent")}
            >
              Most Recent
            </button>
            <button
              type="button"
              onClick={() => setSort("alpha")}
              aria-pressed={sort === "alpha"}
              className={tabClass(sort === "alpha")}
            >
              Alphabetical
            </button>
          </div>
          <div className="relative sm:w-64">
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 pr-9 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <circle cx="11" cy="11" r="7" />
                <path
                  strokeLinecap="round"
                  d="m20 20-3.5-3.5"
                />
              </svg>
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-500">
          {loading ? (
            <span className="inline-block h-4 w-20 animate-pulse rounded bg-zinc-800" />
          ) : (
            `${filteredGames.length} game(s)`
          )}
        </p>

        <div id="games" className="mt-4 flex scroll-mt-6 flex-col gap-6">
          {loading ? (
            [0, 1].map((i) => (
              <div
                key={i}
                aria-hidden
                className="animate-pulse rounded border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded bg-zinc-800" />
                    <div className="h-5 w-40 rounded bg-zinc-700" />
                  </div>
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="overflow-hidden rounded bg-zinc-900">
                      <div className="aspect-video w-full bg-zinc-800" />
                      <div className="h-4 w-2/3 rounded bg-zinc-800 p-2" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : filteredGames.length === 0 ? (
            <p className="text-zinc-400">
              {q ? `No games match "${search}".` : "No games yet."}
            </p>
          ) : (
            filteredGames.map((g) => {
              const mods = topMods[g.id] ?? [];
              const count = modCounts[g.id];
              return (
                <section
                  key={g.id}
                  className="relative overflow-hidden rounded border border-zinc-800 bg-zinc-900/40"
                >
                  {/* Fading game banner strip at the very top */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-24"
                  >
                    <GameBanner
                      url={g.banner_url}
                      name={g.name}
                      className="h-full w-full object-cover opacity-10 [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)]"
                      fallback={
                        <div className="h-full w-full bg-gradient-to-b from-blue-950/30 to-transparent" />
                      }
                    />
                  </div>

                  <div className="relative p-4">
                  {/* Game row header */}
                  <div className="flex flex-wrap items-center gap-3 drop-shadow">
                    <Link
                      to={`/games/${g.slug}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <ProjectIcon
                        url={g.icon_url}
                        name={g.name}
                        className="h-9 w-9 rounded border border-zinc-700"
                      />
                      <span className="truncate text-lg font-bold text-white hover:underline">
                        {g.name}
                      </span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm text-sky-400/90">
                        {modsLoading && count == null ? (
                          <span className="inline-block h-4 w-16 animate-pulse rounded bg-zinc-800" />
                        ) : (
                          `${count ?? 0} item${(count ?? 0) === 1 ? "" : "s"}`
                        )}
                      </span>
                      <Link
                        to={`/games/${g.slug}`}
                        className="rounded border border-zinc-700 bg-zinc-800/90 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
                      >
                        See All
                      </Link>
                    </div>
                  </div>

                  {/* Top liked mods */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {modsLoading && mods.length === 0 ? (
                      [0, 1, 2].map((j) => (
                        <div
                          key={j}
                          aria-hidden
                          className="animate-pulse overflow-hidden rounded border border-zinc-800 bg-zinc-900"
                        >
                          <div className="aspect-video w-full bg-zinc-800" />
                          <div className="flex items-center justify-between gap-2 p-2">
                            <div className="h-4 w-1/2 rounded bg-zinc-800" />
                            <div className="h-3 w-20 rounded bg-zinc-800" />
                          </div>
                        </div>
                      ))
                    ) : mods.length === 0 ? (
                      <p className="text-sm text-zinc-500 sm:col-span-3">
                        No mods for {g.name} yet.{" "}
                        <Link
                          to="/mods/new"
                          className="text-sky-400 hover:underline"
                        >
                          Be the first to share one
                        </Link>
                        .
                      </p>
                    ) : (
                      mods.map((m) => (
                        <Link
                          key={m.id}
                          to={`/games/${g.slug}/${m.slug}`}
                          className="group overflow-hidden rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                        >
                          <div className="aspect-video w-full overflow-hidden bg-zinc-800">
                            <ProjectIcon
                              url={m.icon_url}
                              name={m.name}
                              className="h-full w-full rounded-none border-0 text-3xl transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                            <p className="min-w-0 flex-1 truncate text-sm text-sky-300/90 group-hover:text-sky-200 group-hover:underline">
                              {m.name}
                            </p>
                            <VoteStars
                              likes={m.like_count}
                              dislikes={m.dislike_count}
                              size="sm"
                              showCount={false}
                            />
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
