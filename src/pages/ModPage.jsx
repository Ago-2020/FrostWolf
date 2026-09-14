import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import Markdown from "../components/Markdown";
import { VoteStars, VoteButtons } from "../components/VoteButtons";

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
          .select("id, username, avatar_url")
          .eq("id", data.owner_id)
          .maybeSingle();
      })
      .then((res) => {
        if (cancelled || !res) return;
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

  if (!project) return <p className="p-12 text-center text-zinc-400">Loading...</p>;

  const versions = [...(project.project_versions ?? [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const latest = versions[0];
  const isOwner = user?.id === project.owner_id;
  const likeCount = Number(project.like_count) || 0;
  const dislikeCount = Number(project.dislike_count) || 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start gap-5">
        <ProjectIcon
          url={project.icon_url}
          name={project.name}
          className="h-20 w-20 rounded-lg border border-zinc-700 text-3xl"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {project.games?.name} • {project.project_type} •{" "}
            {project.download_count ?? 0} downloads • by{" "}
            <Link
              to={`/users/${project.owner_id}`}
              className="text-zinc-400 hover:text-white hover:underline"
            >
              {author?.username ?? "unknown"}
            </Link>
            {user?.id === project.owner_id && (
              <>
                {" • "}
                <Link
                  to={`/mods/${project.slug}/settings`}
                  className="text-blue-400 hover:underline"
                >
                  Settings
                </Link>
              </>
            )}
          </p>
          <div className="mt-2">
            <VoteStars likes={likeCount} dislikes={dislikeCount} size="md" />
          </div>
          {project.summary && (
            <p className="mt-3 text-zinc-300">{project.summary}</p>
          )}
          {(project.project_tags ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(project.project_tags ?? [])
                .map((pt) => pt.tags)
                .filter(Boolean)
                .map((t) => (
                  <Link
                    key={t.id}
                    to={`/games/${project.games?.slug}?tag=${t.slug}`}
                    className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
                  >
                    {t.name}
                  </Link>
                ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <button
            onClick={() => setDownloadOpen(true)}
            className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500"
          >
            Download
          </button>
          {latest && (
            <p className="mt-1 text-xs text-zinc-500">latest {latest.version}</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Rating
            </p>
            <div className="mt-1">
              <VoteStars likes={likeCount} dislikes={dislikeCount} size="lg" />
            </div>
          </div>
          <div className="text-right">
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
                size="lg"
              />
            )}
            {voteError && (
              <p className="mt-1 text-xs text-red-400">{voteError}</p>
            )}
          </div>
        </div>
      </div>

      <Markdown text={project.description} className="mt-8" />

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
                      onClick={() => downloadVersion(version)}
                      className="shrink-0 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
                    >
                      Download
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModPage;
