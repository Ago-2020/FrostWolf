import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import Markdown from "../components/Markdown";
import Gallery from "../components/Gallery";
import VersionFilters from "../components/VersionFilters";
import { filterVersions } from "../lib/versionFilters";
import { VoteStars, VoteButtons } from "../components/VoteButtons";
import { ModPageSkeleton } from "../components/Skeletons";

function VersionDownloadList({ versions, onDownload }) {
  if (versions.length === 0) {
    return (
      <p className="text-zinc-400">No versions match these filters.</p>
    );
  }
  return (
    <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
      {versions.map((version) => {
        const gv = (version.project_version_game_versions ?? [])
          .map((x) => x.game_versions?.version)
          .filter(Boolean);
        const ld = (version.project_version_loaders ?? [])
          .map((x) => x.loaders?.name)
          .filter(Boolean);
        return (
          <li
            key={version.id}
            className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-white">
                {version.version}
                {version.release_channel !== "release" && (
                  <span className="ml-2 rounded bg-zinc-700 px-2 py-0.5 text-xs uppercase text-zinc-300">
                    {version.release_channel}
                  </span>
                )}
              </p>
              <p className="text-sm text-zinc-500">
                {version.download_count} downloads
              </p>
              {(gv.length > 0 || ld.length > 0) && (
                <p className="mt-1 text-xs text-zinc-500">
                  {[gv.join(", "), ld.join(", ")]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
            <button
              onClick={() => onDownload(version)}
              className="shrink-0 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
            >
              Download
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ModPage() {
  const { slug, projectSlug } = useParams();
  const pageSlug = projectSlug ?? slug;
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [author, setAuthor] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [userVote, setUserVote] = useState(0);
  const [voteSaving, setVoteSaving] = useState(false);
  const [voteError, setVoteError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [media, setMedia] = useState([]);
  const [downloadGameVersionId, setDownloadGameVersionId] = useState("");
  const [downloadLoaderId, setDownloadLoaderId] = useState("");

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatCompact(value) {
    const n = Number(value) || 0;
    if (n < 1000) return `${n}`;
    if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  function formatFileSize(bytes) {
    if (bytes == null) return null;
    const n = Number(bytes);
    if (!Number.isFinite(n)) return null;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024)
      return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select(
        "*, games ( name, slug ), project_tags ( tags ( id, name, slug ) ), project_versions!project_versions_project_id_fkey ( *, project_version_game_versions ( game_versions ( id, version ) ), project_version_loaders ( loaders ( id, name, slug ) ) )"
      )
      .eq("slug", pageSlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setNotFound(true);
          return;
        }
        setProject(data);

        return supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", data.owner_id)
          .maybeSingle();
      })
      .then((res) => {
        if (cancelled || !res) return;
        if (res.error) {
          console.error("Failed to load author:", res.error);
          return;
        }
        setAuthor(res.data);
      });

    return () => {
      cancelled = true;
    };
  }, [pageSlug]);

  // Live vote stats (source of truth). Cached projects.like_count /
  // dislike_count can lag behind the trigger, so compute from the votes table.
  useEffect(() => {
    let cancelled = false;
    if (!project?.id) return;
    supabase
      .from("project_media")
      .select("*")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setMedia(data);
      });
    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  // Live vote stats (source of truth). Cached projects.like_count /
  // dislike_count can lag behind the trigger, so compute from the votes table.
  useEffect(() => {
    let cancelled = false;
    if (!project?.id) return;
    supabase
      .from("project_ratings")
      .select("value")
      .eq("project_id", project.id)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const likes = data.filter((r) => r.value === 1).length;
        const dislikes = data.filter((r) => r.value === -1).length;
        setProject((prev) =>
          prev && prev.id === project.id
            ? { ...prev, like_count: likes, dislike_count: dislikes }
            : prev
        );
      });
    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  // Load the signed-in user's existing vote for this project.
  useEffect(() => {
    let cancelled = false;
    // Reset when switching projects; the fetch below overwrites if a vote exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserVote(0);
    setVoteError(null);
    if (!user || !project?.id || user.id === project.owner_id) return;
    supabase
      .from("project_ratings")
      .select("value")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.value === 1 || data?.value === -1) setUserVote(data.value);
      });
    return () => {
      cancelled = true;
    };
  }, [user, project?.id, project?.owner_id]);

  async function refreshVoteStats() {
    if (!project?.id) return;
    // Recompute from the votes table so the UI is correct even if the
    // cached projects.like_count / dislike_count columns lag behind.
    const { data, error } = await supabase
      .from("project_ratings")
      .select("value")
      .eq("project_id", project.id);
    if (!error && data) {
      const likes = data.filter((r) => r.value === 1).length;
      const dislikes = data.filter((r) => r.value === -1).length;
      setProject((prev) =>
        prev ? { ...prev, like_count: likes, dislike_count: dislikes } : prev
      );
    }
  }

  async function handleVote(next) {
    if (!user || !project?.id || voteSaving) return;
    // Clicking the active button again removes the vote (toggle).
    const target = userVote === next ? 0 : next;
    setVoteSaving(true);
    setVoteError(null);
    if (target === 0) {
      const { error } = await supabase
        .from("project_ratings")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", user.id);
      if (error) {
        setVoteError(error.message);
      } else {
        setUserVote(0);
        await refreshVoteStats();
      }
    } else {
      const { error } = await supabase.from("project_ratings").upsert(
        { project_id: project.id, user_id: user.id, value: target },
        { onConflict: "project_id,user_id" }
      );
      if (error) {
        setVoteError(error.message);
      } else {
        setUserVote(target);
        await refreshVoteStats();
      }
    }
    setVoteSaving(false);
  }

  function bumpDownloadCount(versionId) {
    setProject((prev) => ({
      ...prev,
      project_versions: prev.project_versions.map((v) =>
        v.id === versionId ? { ...v, download_count: v.download_count + 1 } : v
      ),
    }));
  }

  async function downloadVersion(version) {
    if (!version.file_path) {
      console.error("This version has no file attached.");
      return;
    }

    const { error: countError } = await supabase.rpc(
      "increment_download_count",
      {
        p_version_id: version.id,
      }
    );

    if (countError) {
      console.error(countError);
    } else {
      bumpDownloadCount(version.id);
    }

    if (/^https?:\/\//.test(version.file_path)) {
      window.open(version.file_path, "_blank");
      return;
    }

    const { data, error } = await supabase.storage
      .from("project-files")
      .download(version.file_path);

    if (error) {
      console.error(error);
      return;
    }

    const url = URL.createObjectURL(data);

    const a = document.createElement("a");
    a.href = url;
    a.download = version.file_name ?? version.file_path;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (notFound) {
    return <p className="p-12 text-center text-zinc-400">Project not found.</p>;
  }

  if (!project) return <ModPageSkeleton />;

  const versions = [...(project.project_versions ?? [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const latest = versions[0];
  const isOwner = user?.id === project.owner_id;
  const likeCount = Number(project.like_count) || 0;
  const dislikeCount = Number(project.dislike_count) || 0;

  const tags = (project.project_tags ?? [])
    .map((pt) => pt.tags)
    .filter(Boolean);
  const allGameVersions = [
    ...new Set(
      versions.flatMap((v) =>
        (v.project_version_game_versions ?? [])
          .map((x) => x.game_versions?.version)
          .filter(Boolean)
      )
    ),
  ];
  const allLoaders = [
    ...new Set(
      versions.flatMap((v) =>
        (v.project_version_loaders ?? [])
          .map((x) => x.loaders?.name)
          .filter(Boolean)
      )
    ),
  ];
  const versionsWithChangelog = versions.filter((v) =>
    v.changelog?.trim()
  );

  // Download modal: nothing listed until the player picks a game
  // version and/or loader, then show only the latest match.
  const downloadFiltered = filterVersions(versions, {
    gameVersionId: downloadGameVersionId,
    loaderId: downloadLoaderId,
  });
  const downloadFiltersActive = Boolean(
    downloadGameVersionId || downloadLoaderId
  );
  const downloadList = downloadFiltered.slice(0, 1);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "versions", label: `Versions (${versions.length})` },
    { id: "changelog", label: "Changelog" },
  ];

  function versionMeta(version) {
    const gv = (version.project_version_game_versions ?? [])
      .map((x) => x.game_versions?.version)
      .filter(Boolean);
    const ld = (version.project_version_loaders ?? [])
      .map((x) => x.loaders?.name)
      .filter(Boolean);
    return { gv, ld };
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      {project.games?.slug && (
        <Link
          to={`/games/${project.games.slug}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 5l-7 7 7 7"
            />
          </svg>
          {project.games.name} mods
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ProjectIcon
          url={project.icon_url}
          name={project.name}
          className="h-20 w-20 rounded-lg border border-zinc-700 text-3xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          {project.summary && (
            <p className="mt-1 text-zinc-400">{project.summary}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-zinc-400"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 19h16"
                />
              </svg>
              {formatCompact(project.download_count)} downloads
            </span>
            <span className="text-zinc-600" aria-hidden>
              •
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-zinc-400"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"
                />
              </svg>
              {formatCompact(likeCount)} likes
            </span>
            {tags.length > 0 && (
              <>
                <span className="text-zinc-600" aria-hidden>
                  •
                </span>
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    to={`/games/${project.games?.slug}?tag=${t.slug}`}
                    className="rounded-md border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
                  >
                    {t.name}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="flex items-center gap-2 sm:justify-end">
            {isOwner && (
              <Link
                to={`/mods/${project.slug}/settings`}
                className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 font-medium text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Settings
              </Link>
            )}
            <button
              onClick={() => {
                setDownloadGameVersionId("");
                setDownloadLoaderId("");
                setDownloadOpen(true);
              }}
              className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500"
            >
              Download
            </button>
          </div>
          {latest && (
            <p className="mt-1 text-xs text-zinc-500">latest {latest.version}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* Main column with tabs */}
        <main className="min-w-0 flex-1">
          <nav
            aria-label="Project sections"
            className="flex gap-1 border-b border-zinc-800"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="pt-6">
            {activeTab === "overview" && (
              <>
                <Gallery items={media} />
                <Markdown text={project.description} />
              </>
            )}

            {activeTab === "versions" && (
              <>
                {versions.length === 0 ? (
                  <p className="text-zinc-400">No versions published yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {versions.map((version) => {
                      const { gv, ld } = versionMeta(version);
                      const size = formatFileSize(version.file_size);
                      return (
                        <li
                          key={version.id}
                          className="rounded border border-zinc-800 bg-zinc-900 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-white">
                                {version.version}
                                {version.release_channel !== "release" && (
                                  <span className="ml-2 rounded bg-zinc-700 px-2 py-0.5 text-xs uppercase text-zinc-300">
                                    {version.release_channel}
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {formatDate(version.created_at)} •{" "}
                                {version.download_count ?? 0} downloads
                                {size ? ` • ${size}` : ""}
                                {version.file_name
                                  ? ` • ${version.file_name}`
                                  : ""}
                              </p>
                              {(gv.length > 0 || ld.length > 0) && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {gv.map((g) => (
                                    <span
                                      key={`gv-${g}`}
                                      className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300"
                                    >
                                      {g}
                                    </span>
                                  ))}
                                  {ld.map((l) => (
                                    <span
                                      key={`ld-${l}`}
                                      className="rounded border border-blue-900 bg-blue-950 px-2 py-0.5 text-xs text-blue-200"
                                    >
                                      {l}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => downloadVersion(version)}
                              className="shrink-0 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
                            >
                              Download
                            </button>
                          </div>
                          {version.changelog?.trim() && (
                            <div className="mt-3 border-t border-zinc-800 pt-3">
                              <Markdown text={version.changelog} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {activeTab === "changelog" && (
              <>
                {versionsWithChangelog.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-center">
                    <p className="text-zinc-400">
                      No changelog entries yet.
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Version changelogs will appear here once published.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {versionsWithChangelog.map((version) => (
                      <section
                        key={version.id}
                        className="rounded border border-zinc-800 bg-zinc-900 p-5"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-white">
                            {version.version}
                          </h2>
                          {version.release_channel !== "release" && (
                            <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs uppercase text-zinc-300">
                              {version.release_channel}
                            </span>
                          )}
                          <span className="text-xs text-zinc-500">
                            {formatDate(version.created_at)}
                          </span>
                        </div>
                        <Markdown text={version.changelog} />
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Right sidebar with extra info */}
        <aside className="w-full shrink-0 lg:w-80">
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Creator
              </h2>
              <Link
                to={`/users/${project.owner_id}`}
                className="flex items-center gap-3 hover:opacity-90"
              >
                {author?.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt={author.display_name?.trim() || author.username || ""}
                    className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg text-zinc-400">
                    {(
                      author?.display_name?.trim() ||
                      author?.username ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-white hover:underline">
                    {author?.display_name?.trim() || author?.username || "unknown"}
                  </p>
                  <p className="text-xs text-zinc-500">Project owner</p>
                </div>
              </Link>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Rating
              </h2>
              <div className="flex flex-col gap-3">
                <VoteStars likes={likeCount} dislikes={dislikeCount} size="md" />
                {!user ? (
                  <p className="text-sm text-zinc-400">
                    <Link to="/login" className="text-blue-400 hover:underline">
                      Log in
                    </Link>{" "}
                    to like or dislike this project.
                  </p>
                ) : isOwner ? (
                  <p className="text-sm text-zinc-500">
                    You can&apos;t vote on your own project.
                  </p>
                ) : (
                  <VoteButtons
                    likes={likeCount}
                    dislikes={dislikeCount}
                    userVote={userVote}
                    onVote={handleVote}
                    disabled={voteSaving}
                    size="md"
                  />
                )}
                {voteError && (
                  <p className="text-xs text-red-400">{voteError}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Details
              </h2>
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Game</dt>
                  <dd>
                    {project.games?.slug ? (
                      <Link
                        to={`/games/${project.games.slug}`}
                        className="text-zinc-200 hover:text-white hover:underline"
                      >
                        {project.games.name}
                      </Link>
                    ) : (
                      <span className="text-zinc-200">
                        {project.games?.name ?? "-"}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="text-zinc-200">{project.project_type}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Downloads</dt>
                  <dd className="text-zinc-200">
                    {project.download_count ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Latest version</dt>
                  <dd className="text-zinc-200">
                    {latest ? (
                      <button
                        onClick={() => setActiveTab("versions")}
                        className="hover:text-white hover:underline"
                      >
                        {latest.version}
                      </button>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Created</dt>
                  <dd className="text-zinc-200">
                    {formatDate(project.created_at)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Updated</dt>
                  <dd className="text-zinc-200">
                    {formatDate(project.updated_at)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Game versions
              </h2>
              {allGameVersions.length === 0 ? (
                <p className="text-sm text-zinc-500">Not specified</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allGameVersions.map((v) => (
                    <span
                      key={v}
                      className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Mod loader
              </h2>
              {allLoaders.length === 0 ? (
                <p className="text-sm text-zinc-500">Not specified</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allLoaders.map((l) => (
                    <span
                      key={l}
                      className="rounded border border-blue-900 bg-blue-950 px-2 py-0.5 text-xs text-blue-200"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>

      {downloadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDownloadOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Download {project.name}
              </h2>
              <button
                onClick={() => setDownloadOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>
            {versions.length === 0 ? (
              <p className="text-zinc-400">No versions published yet.</p>
            ) : (
              <>
                <div className="mb-4">
                  <VersionFilters
                    versions={versions}
                    gameVersionId={downloadGameVersionId}
                    loaderId={downloadLoaderId}
                    onGameVersionChange={setDownloadGameVersionId}
                    onLoaderChange={setDownloadLoaderId}
                  />
                </div>
                {downloadFiltersActive ? (
                  <>
                    {downloadList.length > 0 && (
                      <p className="mb-3 text-xs text-zinc-500">
                        Showing the latest version matching your filters.
                      </p>
                    )}
                    <VersionDownloadList
                      versions={downloadList}
                      onDownload={downloadVersion}
                    />
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Select a game version and loader above to find your
                    download.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModPage;
