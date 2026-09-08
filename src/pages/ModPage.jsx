import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function ModPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadProject() {
      const { data, error } = await supabase
        .from("projects")
        .select("*, games ( name, slug ), project_versions!project_versions_project_id_fkey ( * )")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(error);
        setNotFound(true);
        return;
      }

      if (!data) {
        setNotFound(true);
        return;
      }

      setProject(data);
    }

    loadProject();
  }, [slug]);

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

  if (notFound) return <p className="p-12 text-center text-zinc-400">Project not found.</p>;
  if (!project) return <p>Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-white">{project.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {project.games?.name} • mod
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
      <p className="mt-4 text-zinc-300">{project.description}</p>

      <h2 className="mb-3 mt-8 text-xl font-semibold text-white">Versions</h2>
      {project.project_versions.length === 0 ? (
        <p className="text-zinc-400">No versions published yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {project.project_versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 p-4"
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
  );
}

export default ModPage;
