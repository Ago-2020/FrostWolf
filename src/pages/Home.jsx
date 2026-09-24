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

  const featuredGame = useMemo(
    () =>
      games.find((g) => g.banner_url) ?? games[0] ?? null,
    [games]
  );
  const featuredCount = featuredGame ? modCounts[featuredGame.id] : null;

  // Hero gallery: 0 = FrostWolf, 1 = featured game, 2 = join us.
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setHeroSlide((s) => (s + 1) % 3),
      8000
    );
    return () => clearInterval(id);
  }, []);
  const heroDots = ["FrostWolf", "Featured game", "Join us"];

  return (
    <div>
      {/* Steam-style hero gallery: FrostWolf / featured game / join us */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-[#171a21]">
        {/* Blurred background art, only on the featured-game slide */}
        {heroSlide === 1 && featuredGame?.banner_url && (
          <>
            <GameBanner
              url={featuredGame.banner_url}
              name={featuredGame.name}
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-[2px]"
              fallback={null}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#171a21] via-[#171a21]/85 to-[#171a21]/40"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-[#171a21]/60"
            />
          </>
        )}
        <div className="relative mx-auto max-w-6xl px-6 pt-10">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_320px]">
            {/* Main capsule */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/80">
                {heroSlide === 0
                  ? "FrostWolf"
                  : heroSlide === 1
                    ? "Featured game"
                    : "Join us"}
              </p>
              {loading || (heroSlide === 1 && !featuredGame) ? (
                <div
                  aria-hidden
                  className="mt-3 aspect-[21/9] w-full animate-pulse rounded-lg bg-white/5"
                />
              ) : heroSlide === 0 ? (
                <div className="mt-3 flex aspect-[21/9] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-r from-blue-950 via-[#1b2838] to-zinc-900 shadow-2xl">
                  <img
                    src="/frostwolf-light.svg"
                    alt="FrostWolf"
                    className="h-16 w-auto opacity-90"
                  />
                  <p className="px-6 text-center text-2xl font-bold text-white">
                    Find your next favorite mod
                  </p>
                </div>
              ) : heroSlide === 1 && featuredGame ? (
                <Link
                  to={`/games/${featuredGame.slug}`}
                  className="group mt-3 block overflow-hidden rounded-lg border border-white/10 shadow-2xl"
                >
                  <GameBanner
                    url={featuredGame.banner_url}
                    name={featuredGame.name}
                    className="aspect-[21/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                    fallback={
                      <div
                        aria-hidden
                        className="flex aspect-[21/9] w-full items-center justify-center bg-gradient-to-r from-blue-950 via-[#1b2838] to-zinc-900"
                      >
                        <span className="text-5xl font-bold text-white/20">
                          {(featuredGame.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    }
                  />
                </Link>
              ) : (
                <div className="mt-3 flex aspect-[21/9] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-r from-emerald-950 via-[#1b2838] to-zinc-900 shadow-2xl">
                  <p className="text-2xl font-bold text-white">
                    Share your mod with players
                  </p>
                  <p className="text-sm text-zinc-400">
                    Publish in minutes. Free, forever.
                  </p>
                </div>
              )}
            </div>

            {/* Side info panel */}
            <div className="rounded-lg border border-white/10 bg-black/40 p-5 backdrop-blur-sm">
              {loading || (heroSlide === 1 && !featuredGame) ? (
                <div aria-hidden className="animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded bg-white/10" />
                    <div className="h-6 w-32 rounded bg-white/10" />
                  </div>
                  <div className="mt-4 h-3 w-full rounded bg-white/5" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-white/5" />
                  <div className="mt-5 h-9 w-full rounded bg-white/10" />
                </div>
              ) : heroSlide === 0 ? (
                <>
                  <h1 className="text-2xl font-bold text-white">
                    Mods, made for players
                  </h1>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
                    Browse games, discover community projects, and share your
                    own mods with players.
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <a
                      href="#games"
                      className="rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Browse games
                    </a>
                    <Link
                      to="/mods/new"
                      className="rounded border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      Share a mod
                    </Link>
                  </div>
                </>
              ) : heroSlide === 1 && featuredGame ? (
                <>
                  <div className="flex items-center gap-3">
                    <ProjectIcon
                      url={featuredGame.icon_url}
                      name={featuredGame.name}
                      className="h-12 w-12 rounded border border-white/10"
                    />
                    <div className="min-w-0">
                      <h1 className="truncate text-2xl font-bold text-white">
                        {featuredGame.name}
                      </h1>
                      <p className="text-xs text-zinc-400">
                        {modsLoading || featuredCount == null
                          ? "Loading mods…"
                          : `${featuredCount} mod${featuredCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-zinc-400">
                    Discover community mods for {featuredGame.name}: top
                    liked projects, new releases, and more.
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <Link
                      to={`/games/${featuredGame.slug}`}
                      className="rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Browse mods
                    </Link>
                    <a
                      href="#games"
                      className="rounded border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      All games
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-white">
                    Creators welcome
                  </h1>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
                    Upload versions, write a changelog, add tags and gallery
                    images: everything a player needs to trust your work.
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <Link
                      to="/mods/new"
                      className="rounded bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Publish your first mod
                    </Link>
                    <Link
                      to="/signup"
                      className="rounded border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-medium text-zinc-200 hover:border-white/25 hover:text-white"
                    >
                      Create an account
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Gallery nav: prev / dots / next */}
          <div className="flex items-center justify-between gap-4 py-4">
            <button
              type="button"
              onClick={() =>
                setHeroSlide((s) => (s + heroDots.length - 1) % heroDots.length)
              }
              aria-label="Previous slide"
              className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:border-white/25 hover:text-white"
            >
              ‹
            </button>
            <div className="flex items-center gap-2">
              {heroDots.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHeroSlide(i)}
                  aria-label={`Go to ${label}`}
                  aria-current={i === heroSlide ? "true" : undefined}
                  title={label}
                  className={`h-2 rounded-full transition-all ${
                    i === heroSlide
                      ? "w-8 bg-sky-400"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHeroSlide((s) => (s + 1) % heroDots.length)}
              aria-label="Next slide"
              className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:border-white/25 hover:text-white"
            >
              ›
            </button>
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
