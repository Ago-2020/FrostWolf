import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";

function ModPage() {
  const { slug, projectSlug } = useParams();
  const pageSlug = projectSlug ?? slug;
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [author, setAuthor] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select(
        "*, games ( name, slug ), project_versions!project_versions_project_id_fkey ( * )"
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

    bumpDownloadCount(version.id);
    supabase.rpc("increment_download_count", {
      p_version_id: version.id,
    });

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

  const versions = [...project.project_versions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const latest = versions[0];

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
            {project.games?.name} • {project.project_type} • by{" "}
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
          {project.summary && (
            <p className="mt-3 text-zinc-300">{project.summary}</p>
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

      <p className="mt-8 whitespace-pre-wrap text-zinc-300">
        {project.description}
      </p>

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
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div>
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
                    </div>
                    <button
                      onClick={() => downloadVersion(version)}
                      className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
                    >
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModPage;
