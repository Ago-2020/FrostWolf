import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProjectIcon from "../components/ProjectIcon";
import GameBanner from "../components/GameBanner";
import ModCard from "../components/ModCard";
import ModFiltersSidebar from "../components/ModFiltersSidebar";

const CHANNELS = ["release", "beta", "alpha"];
const PAGE_SIZE = 10;
const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "downloads", label: "Most downloads" },
  { value: "rating", label: "Top rated" },
  { value: "likes", label: "Most liked" },
  { value: "name", label: "Name (A–Z)" },
];

function ModCardSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-pulse overflow-hidden rounded border border-zinc-800 bg-zinc-900"
    >
      <div className="aspect-square w-full bg-zinc-800" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-2/3 rounded bg-zinc-700" />
        <div className="h-3 w-1/3 rounded bg-zinc-800" />
        <div className="h-3 w-1/2 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function pageItems(total, current) {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set(
    [1, 2, total - 1, total, current - 1, current, current + 1].filter(
      (p) => p >= 1 && p <= total
    )
  );
  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push("…");
    items.push(p);
    prev = p;
  }
  return items;
}

function GamePage() {
  const { gameSlug } = useParams();
  const [searchParams] = useSearchParams();
  const [game, setGame] = useState(null);
  const [projects, setProjects] = useState([]);
  const [authors, setAuthors] = useState({});
  const [allTags, setAllTags] = useState([]);
  const [gameVersions, setGameVersions] = useState([]);
  const [loaders, setLoaders] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedGameVersions, setSelectedGameVersions] = useState([]);
  const [selectedLoaders, setSelectedLoaders] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: gameData } = await supabase
        .from("games")
        .select("*")
        .eq("slug", gameSlug)
        .maybeSingle();

      if (cancelled) return;
      if (!gameData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setGame(gameData);
      setNotFound(false);

      const [tagsRes, versionsRes, loadersRes, projectsRes] =
        await Promise.all([
          supabase
            .from("tags")
            .select("id, name, slug")
            .eq("game_id", gameData.id)
            .order("name"),
          supabase
            .from("game_versions")
            .select("id, version")
            .eq("game_id", gameData.id)
            .order("released_at", { ascending: false }),
          supabase
            .from("loaders")
            .select("id, name, slug")
            .eq("game_id", gameData.id)
            .order("name"),
          supabase
            .from("projects")
            .select(
               `id,
                owner_id,
                name,
                slug,
                summary,
                description,
                icon_url,
                download_count,
                like_count,
                dislike_count,
                created_at,
                updated_at,
               project_tags ( tags ( id, name, slug ) ),
               project_versions!project_versions_project_id_fkey (
                 version,
                 release_channel,
                 project_version_game_versions ( game_versions ( id, version ) ),
                 project_version_loaders ( loaders ( id, name, slug ) )
               )`
            )
            .eq("game_id", gameData.id)
            .order("created_at", { ascending: false }),
        ]);

      if (cancelled) return;
      if (tagsRes.error) console.error(tagsRes.error);
      if (versionsRes.error) console.error(versionsRes.error);
      if (loadersRes.error) console.error(loadersRes.error);
      if (projectsRes.error) console.error(projectsRes.error);

      setAllTags(tagsRes.data ?? []);
      setGameVersions(versionsRes.data ?? []);
      setLoaders(loadersRes.data ?? []);
      setProjects(projectsRes.data ?? []);

      const ownerIds = [
        ...new Set(
          (projectsRes.data ?? []).map((p) => p.owner_id).filter(Boolean)
        ),
      ];
      if (ownerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ownerIds);
        if (cancelled) return;
        if (profilesError) {
          console.error("Failed to load authors:", profilesError);
        }
        if (profilesData) {
          setAuthors(
            Object.fromEntries(profilesData.map((a) => [a.id, a]))
          );
        }
      } else if (!cancelled) {
        setAuthors({});
      }

      // Reset filters when switching games, honouring ?tag=slug deep-links
      const tagSlug = searchParams.get("tag");
      const preselected = tagSlug
        ? (tagsRes.data ?? []).filter((t) => t.slug === tagSlug).map((t) => t.id)
        : [];
      setSelectedTags(preselected);
      setSelectedGameVersions([]);
      setSelectedLoaders([]);
      setSelectedChannels([]);
      setSearch("");
      setSort("recent");
      setDateFrom("");
      setDateTo("");
      setPage(1);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSlug]);

  // Any criteria change restarts at the first page (handled in the
  // change handlers below, since setPage is already reset on game switch
  // in load()).
  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleSortChange(value) {
    setSort(value);
    setPage(1);
  }

  function handleToggleTag(id) {
    setSelectedTags((s) => toggle(s, id));
    setPage(1);
  }

  function handleToggleGameVersion(id) {
    setSelectedGameVersions((s) => toggle(s, id));
    setPage(1);
  }

  function handleToggleLoader(id) {
    setSelectedLoaders((s) => toggle(s, id));
    setPage(1);
  }

  function handleToggleChannel(c) {
    setSelectedChannels((s) => toggle(s, c));
    setPage(1);
  }

  function handleDateFromChange(value) {
    setDateFrom(value);
    setPage(1);
  }

  function handleDateToChange(value) {
    setDateTo(value);
    setPage(1);
  }

  const tagsWithCounts = useMemo(() => {
    const counts = new Map();
    for (const p of projects) {
      for (const pt of p.project_tags ?? []) {
        if (pt.tags) counts.set(pt.tags.id, (counts.get(pt.tags.id) ?? 0) + 1);
      }
    }
    return allTags.map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }));
  }, [allTags, projects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    const filtered = projects.filter((project) => {
      if (
        q &&
        ![project.name, project.slug, project.summary, project.description]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      ) {
        return false;
      }

      // Tags: project must have ALL selected tags (AND)
      if (selectedTags.length > 0) {
        const projectTagIds = new Set(
          (project.project_tags ?? [])
            .map((pt) => pt.tags?.id)
            .filter(Boolean)
        );
        if (!selectedTags.every((id) => projectTagIds.has(id))) return false;
      }

      const versions = project.project_versions ?? [];

      // Release channel: at least one version on a selected channel
      if (selectedChannels.length > 0) {
        if (!versions.some((v) => selectedChannels.includes(v.release_channel)))
          return false;
      }

      // Game version + loader: matched on the SAME project version
      // (so "1.21.1 + fabric" only matches a version supporting both).
      const wantGv = selectedGameVersions.length > 0;
      const wantLoader = selectedLoaders.length > 0;
      if (wantGv || wantLoader) {
        const matches = versions.some((v) => {
          const gvIds = (v.project_version_game_versions ?? []).map(
            (x) => x.game_versions?.id
          );
          const loaderIds = (v.project_version_loaders ?? []).map(
            (x) => x.loaders?.id
          );
          const gvOk = !wantGv || gvIds.some((id) => selectedGameVersions.includes(id));
          const loaderOk =
            !wantLoader || loaderIds.some((id) => selectedLoaders.includes(id));
          return gvOk && loaderOk;
        });
        if (!matches) return false;
      }

      // Updated-date range (specific dates)
      if (from || to) {
        const stamp = project.updated_at ?? project.created_at;
        if (!stamp) return false;
        const time = new Date(stamp).getTime();
        if (from && time < from.getTime()) return false;
        if (to && time > to.getTime()) return false;
      }

      return true;
    });

    const sorted = [...filtered];
    if (sort === "downloads") {
      sorted.sort(
        (a, b) => (b.download_count ?? 0) - (a.download_count ?? 0)
      );
    } else if (sort === "rating") {
      // Star ratio: likes / total votes -> 5 stars. Tie-break by total votes.
      sorted.sort((a, b) => {
        const at = (a.like_count ?? 0) + (a.dislike_count ?? 0);
        const bt = (b.like_count ?? 0) + (b.dislike_count ?? 0);
        const ar = at > 0 ? (a.like_count ?? 0) / at : 0;
        const br = bt > 0 ? (b.like_count ?? 0) / bt : 0;
        return br - ar || bt - at;
      });
    } else if (sort === "likes") {
      sorted.sort(
        (a, b) =>
          (b.like_count ?? 0) - (a.like_count ?? 0) ||
          ((b.like_count ?? 0) - (b.dislike_count ?? 0)) -
            ((a.like_count ?? 0) - (a.dislike_count ?? 0))
      );
    } else if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updated_at ?? b.created_at ?? 0) -
          new Date(a.updated_at ?? a.created_at ?? 0)
      );
    }
    return sorted;
  }, [projects, search, selectedTags, selectedGameVersions, selectedLoaders, selectedChannels, sort, dateFrom, dateTo]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PAGE_SIZE)
  );
  const safePage = Math.min(page, totalPages);
  const pagedProjects = filteredProjects.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function goToPage(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (notFound) {
    return <p className="p-12 text-center text-zinc-400">Game not found.</p>;
  }

  const activeFilterCount =
    selectedTags.length +
    selectedGameVersions.length +
    selectedLoaders.length +
    selectedChannels.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (search.trim() ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setSelectedTags([]);
    setSelectedGameVersions([]);
    setSelectedLoaders([]);
    setSelectedChannels([]);
    setDateFrom("");
    setDateTo("");
    setSort("recent");
    setPage(1);
  }

  const sidebarProps = {
    search,
    onSearchChange: handleSearchChange,
    tags: tagsWithCounts,
    selectedTags,
    onToggleTag: handleToggleTag,
    gameVersions,
    selectedGameVersions,
    onToggleGameVersion: handleToggleGameVersion,
    loaders,
    selectedLoaders,
    onToggleLoader: handleToggleLoader,
    channels: CHANNELS,
    selectedChannels,
    onToggleChannel: handleToggleChannel,
    dateFrom,
    dateTo,
    onDateFromChange: handleDateFromChange,
    onDateToChange: handleDateToChange,
    activeFilterCount,
    onClear: clearFilters,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="relative mb-8 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="h-24 w-full animate-pulse bg-zinc-800 sm:aspect-[4/1] sm:h-auto" />
        ) : (
          <>
            {/* Mobile: faint banner backdrop at 10% opacity, no gradient */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 sm:hidden"
            >
              <GameBanner
                url={game?.banner_url}
                name={game?.name}
                className="h-full w-full object-cover opacity-10"
                fallback={null}
              />
            </div>
            {/* Desktop: full banner + readability gradient */}
            <div className="hidden sm:block">
              <GameBanner
                url={game?.banner_url}
                name={game?.name}
                fallback={
                  <div
                    aria-hidden
                    className="aspect-[4/1] w-full bg-gradient-to-r from-blue-950 via-zinc-900 to-zinc-950"
                  />
                }
              />
              {/* Readability gradient over the banner art */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent sm:block"
              />
            </div>
            <div className="relative flex items-center gap-3 p-4 sm:absolute sm:inset-x-0 sm:bottom-0 sm:gap-4 sm:p-6">
              <ProjectIcon
                url={game?.icon_url}
                name={game?.name}
                className="h-12 w-12 rounded-lg border border-zinc-700 text-xl sm:h-16 sm:w-16 sm:text-2xl"
              />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{game?.name}</h1>
                <p className="text-sm text-zinc-400">
                  {filteredProjects.length} of {projects.length} project(s)
                </p>
              </div>
              <button
                onClick={() => setMobileFiltersOpen((o) => !o)}
                className="shrink-0 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300 lg:hidden"
              >
                {mobileFiltersOpen ? "Hide filters" : "Show filters"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block`}>
            <div className="lg:sticky lg:top-6">
              <ModFiltersSidebar {...sidebarProps} isLoading={loading} />
            </div>
          </div>
        </aside>

        {/* Results */}
        <main className="min-w-0 flex-1">
          {loading ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
                <div className="h-9 w-44 animate-pulse rounded bg-zinc-800" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <ModCardSkeleton key={i} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">
                  {filteredProjects.length} result(s)
                  {totalPages > 1 &&
                    ` • Page ${safePage} of ${totalPages}`}
                </p>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {projects.length === 0 ? (
            <p className="text-zinc-400">No projects for this game yet.</p>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-center">
              <p className="text-zinc-400">
                No mods match the current filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-blue-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pagedProjects.map((project) => (
                <ModCard
                  key={project.id}
                  project={project}
                  author={authors[project.owner_id]}
                  gameSlug={gameSlug}
                />
              ))}
            </div>
          )}
          {totalPages > 1 && filteredProjects.length > 0 && (
            <nav
              aria-label="Pagination"
              className="mt-6 flex items-center justify-center gap-1.5"
            >
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              {pageItems(totalPages, safePage).map((item, idx) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    onClick={() => goToPage(item)}
                    aria-current={item === safePage ? "page" : undefined}
                    className={`rounded border px-3 py-1.5 text-sm ${
                      item === safePage
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-sm text-zinc-500"
                  >
                    {item}
                  </span>
                )
              )}
              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default GamePage;
