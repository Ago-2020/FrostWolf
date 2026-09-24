import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import { DashboardProjectSkeleton } from "../components/Skeletons";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "analytics", label: "Analytics" },
];

function Dashboard() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select(
        "*, games ( name ), project_versions!project_versions_project_id_fkey ( id, version )"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          console.error(fetchError);
          setLoading(false);
          return;
        }
        setProjects(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function copyId(id) {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      const input = document.createElement("input");
      input.value = id;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1500);
  }

  const stats = useMemo(() => {
    const downloads = projects.reduce(
      (sum, p) => sum + (p.download_count ?? 0),
      0
    );
    const versions = projects.reduce(
      (sum, p) => sum + (p.project_versions?.length ?? 0),
      0
    );
    const likes = projects.reduce((sum, p) => sum + (p.like_count ?? 0), 0);
    return { count: projects.length, downloads, versions, likes };
  }, [projects]);

  const topProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0))
        .slice(0, 5),
    [projects]
  );

  const maxDownloads = Math.max(
    1,
    ...projects.map((p) => p.download_count ?? 0)
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = projects.filter((p) => {
      if (statusFilter !== "all" && projectStatus(p) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.games?.name?.toLowerCase().includes(q)
      );
    });
    return [...rows].sort((a, b) => {
      if (sortMode === "name-asc") return a.name.localeCompare(b.name);
      if (sortMode === "name-desc") return b.name.localeCompare(a.name);
      if (sortMode === "downloads")
        return (b.download_count ?? 0) - (a.download_count ?? 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [projects, search, statusFilter, sortMode]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav
          aria-label="Dashboard sections"
          className="flex shrink-0 gap-1 overflow-x-auto rounded border border-zinc-800 bg-zinc-900 p-2 md:w-52 md:flex-col"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "overview" && (
            <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <Link
                to={`/users/${user.id}`}
                className="mb-6 flex items-center gap-4 rounded border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-700"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xl font-semibold text-white">
                    {(
                      profile?.display_name?.trim() ||
                      profile?.username ||
                      user?.email ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xl font-bold text-white">
                    {profile?.display_name?.trim() ||
                      profile?.username ||
                      user?.email ||
                      "Your profile"}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                    Visit your profile
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 6l6 6-6 6"
                      />
                    </svg>
                  </span>
                </span>
              </Link>
              <h2 className="mb-4 text-lg font-semibold text-white">
                Overview
              </h2>
              {loading ? (
                <div className="grid grid-cols-2 gap-4" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <div className="h-3 w-20 rounded bg-zinc-800" />
                      <div className="mt-2 h-6 w-16 rounded bg-zinc-800" />
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  You haven&apos;t created any projects yet. Once you do,
                  totals for downloads, versions and likes will appear here.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-400">Projects</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {stats.count}
                      </p>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-400">Downloads</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {stats.downloads.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-400">Versions</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {stats.versions}
                      </p>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-400">Likes</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {stats.likes}
                      </p>
                    </div>
                  </div>
                  <h3 className="mb-2 mt-6 text-sm font-medium text-zinc-300">
                    Recent projects
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {projects.slice(0, 3).map((project) => (
                      <li
                        key={project.id}
                        className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-950 px-3 py-2"
                      >
                        <ProjectIcon
                          url={project.icon_url}
                          name={project.name}
                          className="h-9 w-9 rounded-md border border-zinc-700"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/mods/${project.slug}`}
                            className="block truncate text-sm font-medium text-white hover:underline"
                          >
                            {project.name}
                          </Link>
                          <p className="text-xs text-zinc-500">
                            {(project.download_count ?? 0).toLocaleString()}{" "}
                            downloads • {project.visibility}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {activeTab === "projects" && (
            <ProjectsTable
              loading={loading}
              projects={projects}
              filtered={filtered}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              copiedId={copiedId}
              onCopyId={copyId}
            />
          )}

          {activeTab === "analytics" && (
            <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Analytics
              </h2>
              {loading ? (
                <div className="flex animate-pulse flex-col gap-3" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded border border-zinc-800 bg-zinc-950"
                    />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  No data yet. Publish a project and its downloads will show
                  up here.
                </p>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-400">Total downloads</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {stats.downloads.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-400">Total likes</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {stats.likes}
                      </p>
                    </div>
                  </div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-300">
                    Downloads by project
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {topProjects.map((project) => (
                      <li key={project.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <Link
                            to={`/mods/${project.slug}`}
                            className="truncate text-sm text-white hover:underline"
                          >
                            {project.name}
                          </Link>
                          <span className="shrink-0 text-sm text-zinc-400">
                            {(project.download_count ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${
                                ((project.download_count ?? 0) /
                                  maxDownloads) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {project.project_versions?.length ?? 0} version(s) •{" "}
                          {project.like_count ?? 0} likes
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectsTable({
  loading,
  projects,
  filtered,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  copiedId,
  onCopyId,
}) {
  const nameSorting = sortMode === "name-asc" || sortMode === "name-desc";

  function toggleNameSort() {
    onSortModeChange(sortMode === "name-asc" ? "name-desc" : "name-asc");
  }

  return (
    <section aria-label="Projects">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {loading
              ? "Loading your projects…"
              : projects.length === 0
                ? "Create your first project to get started."
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          to="/mods/new"
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            className="h-4 w-4"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Create a project
        </Link>
      </div>

      {!loading && projects.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search projects</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500"
            />
          </label>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              title="Filter by status"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-300"
            >
              <option value="all">All statuses</option>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => onSortModeChange(e.target.value)}
              title="Sort projects"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-300"
            >
              <option value="recent">Recently created</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="downloads">Most downloaded</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <DashboardProjectSkeleton />
            </li>
          ))}
        </ul>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="font-medium text-zinc-200">No projects yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Publish a mod or project and it will show up here.
          </p>
          <Link
            to="/mods/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              className="h-4 w-4"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Create your first project
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="font-medium text-zinc-200">
            No projects match your search
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onStatusFilterChange("all");
            }}
            className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_5rem_6.5rem_2.5rem] items-center gap-3 border-b border-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-500">
              <button
                type="button"
                onClick={toggleNameSort}
                title="Sort by name"
                className="flex items-center gap-1 hover:text-zinc-300"
              >
                Name
                <span aria-hidden className="text-[10px]">
                  {sortMode === "name-asc"
                    ? "▲"
                    : sortMode === "name-desc"
                      ? "▼"
                      : nameSorting
                        ? ""
                        : "^"}
                </span>
              </button>
              <span>ID</span>
              <span>Type</span>
              <span>Status</span>
              <span className="sr-only">Settings</span>
            </div>
            <ul className="divide-y divide-zinc-800">
              {filtered.map((project) => {
                const status = projectStatus(project);
                return (
                  <li
                    key={project.id}
                    className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_5rem_6.5rem_2.5rem] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-800/30"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ProjectIcon
                        url={project.icon_url}
                        name={project.name}
                        className="h-8 w-8 rounded-md border border-zinc-700 text-sm"
                      />
                      <Link
                        to={`/mods/${project.slug}`}
                        title={project.name}
                        className="truncate text-sm font-medium text-zinc-100 hover:text-white hover:underline"
                      >
                        {project.name}
                      </Link>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <code
                        title={project.id}
                        className="truncate rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-300"
                      >
                        {shortId(project.id)}
                      </code>
                      <button
                        type="button"
                        onClick={() => onCopyId(project.id)}
                        title={
                          copiedId === project.id
                            ? "Copied!"
                            : "Copy full ID"
                        }
                        aria-label={`Copy ID of ${project.name}`}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                      >
                        {copiedId === project.id ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-3.5 w-3.5 text-green-400"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            className="h-3.5 w-3.5"
                            aria-hidden
                          >
                            <rect x="9" y="9" width="12" height="12" rx="2" />
                            <path d="M5 15V5a2 2 0 012-2h10" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <span className="truncate text-sm text-zinc-400">
                      {capitalize(project.project_type ?? "mod")}
                    </span>
                    <span>
                      <StatusLabel status={status} />
                    </span>
                    <span className="flex justify-end">
                      <Link
                        to={`/mods/${project.slug}/settings`}
                        title={`Open settings for ${project.name}`}
                        aria-label={`Open settings for ${project.name}`}
                        className="rounded-full bg-zinc-800 p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          className="h-4 w-4"
                          aria-hidden
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                          />
                        </svg>
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusLabel({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-zinc-300">
      {status === "public" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-3.5 w-3.5 text-zinc-500"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
        </svg>
      )}
      {status === "draft" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-3.5 w-3.5 text-zinc-500"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 3v5h5"
          />
        </svg>
      )}
      {(status === "unlisted" || status === "private") && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-3.5 w-3.5 text-zinc-500"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M10.5 5.2A9.8 9.8 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.7 3.7M6.6 6.6C4 8.2 2.5 10.6 2 12c1 2.5 5 7 10 7 1.5 0 2.9-.4 4.1-1"
          />
        </svg>
      )}
      {capitalize(status)}
    </span>
  );
}

function shortId(id) {
  if (!id) return "—";
  return id.replace(/-/g, "").slice(0, 8);
}

function projectStatus(project) {
  if ((project.project_versions?.length ?? 0) === 0) return "draft";
  return project.visibility ?? "private";
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default Dashboard;
