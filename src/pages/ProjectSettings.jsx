import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import VersionForm from "../components/VersionForm";

const PROJECT_TYPES = ["mod", "modpack", "resourcepack", "shader", "datapack"];
const VISIBILITIES = ["public", "unlisted", "private"];

function ProjectSettings() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [general, setGeneral] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select(
        "*, games ( name, slug ), project_versions!project_versions_project_id_fkey ( * )"
      )
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setNotFound(true);
          return;
        }
        setProject(data);
        setGeneral({
          name: data.name,
          slug: data.slug,
          description: data.description ?? "",
          project_type: data.project_type,
          icon_url: data.icon_url ?? "",
          visibility: data.visibility,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  function loadProject() {
    supabase
      .from("projects")
      .select(
        "*, games ( name, slug ), project_versions!project_versions_project_id_fkey ( * )"
      )
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          return;
        }
        setProject(data);
      });
  }

  function updateGeneral(name, value) {
    setGeneral((g) => ({ ...g, [name]: value }));
  }

  async function saveGeneral(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        name: general.name,
        slug: general.slug,
        description: general.description,
        project_type: general.project_type,
        icon_url: general.icon_url || null,
        visibility: general.visibility,
      })
      .eq("id", project.id);

    setSaving(false);

    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
      return;
    }

    setMessage({ type: "success", text: "Saved." });

    if (general.slug !== slug) {
      setProject((p) => ({ ...p, slug: general.slug }));
      navigate(`/mods/${general.slug}/settings`, { replace: true });
    }
  }

  async function deleteVersion(versionId) {
    const { error: deleteError } = await supabase
      .from("project_versions")
      .delete()
      .eq("id", versionId);

    if (deleteError) {
      setMessage({ type: "error", text: deleteError.message });
      return;
    }

    loadProject();
  }

  async function deleteProject() {
    if (!window.confirm(`Delete "${project.name}" and all its versions?`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (deleteError) {
      setMessage({ type: "error", text: deleteError.message });
      return;
    }

    navigate("/dashboard");
  }

  if (notFound) {
    return <p className="p-12 text-center text-zinc-400">Project not found.</p>;
  }

  if (!project || !general) {
    return <p className="p-12 text-center text-zinc-400">Loading...</p>;
  }

  const isOwner = user?.id === project.owner_id;
  const labelClass = "mb-1 block text-sm font-medium text-zinc-300";
  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{project.name} — Settings</h1>
        <Link
          to={`/mods/${project.slug}`}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Back to project
        </Link>
      </div>

      {!isOwner && (
        <p className="mb-6 rounded bg-yellow-900/50 p-3 text-sm text-yellow-200">
          Only the project owner can edit these settings.
        </p>
      )}

      {message && (
        <p
          className={`mb-6 rounded p-3 text-sm ${
            message.type === "error"
              ? "bg-red-900/50 text-red-200"
              : "bg-green-900/50 text-green-200"
          }`}
        >
          {message.text}
        </p>
      )}

      {isOwner && (
        <>
          <section className="mb-10 rounded border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              General info
            </h2>
            <form onSubmit={saveGeneral} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  value={general.name}
                  onChange={(e) => updateGeneral("name", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  value={general.slug}
                  onChange={(e) => updateGeneral("slug", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={general.description}
                  onChange={(e) => updateGeneral("description", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={labelClass}>Project type</label>
                  <select
                    value={general.project_type}
                    onChange={(e) =>
                      updateGeneral("project_type", e.target.value)
                    }
                    className={inputClass}
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Visibility</label>
                  <select
                    value={general.visibility}
                    onChange={(e) =>
                      updateGeneral("visibility", e.target.value)
                    }
                    className={inputClass}
                  >
                    {VISIBILITIES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Icon URL</label>
                <input
                  value={general.icon_url}
                  onChange={(e) => updateGeneral("icon_url", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <button
                disabled={saving}
                className="self-start rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </section>

          <section className="mb-10 rounded border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Versions</h2>
              <button
                onClick={() => setShowVersionForm((s) => !s)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
              >
                {showVersionForm ? "Cancel" : "Add Version"}
              </button>
            </div>

            {showVersionForm && (
              <div className="mb-6 border-b border-zinc-800 pb-6">
                <VersionForm
                  projectId={project.id}
                  game_id={project.game_id}
                  onDone={() => {
                    setShowVersionForm(false);
                    loadProject();
                  }}
                />
              </div>
            )}

            {project.project_versions.length === 0 ? (
              <p className="text-sm text-zinc-400">No versions published yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {project.project_versions.map((version) => (
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
                        {version.download_count} downloads •{" "}
                        {version.file_name ?? "no file"}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteVersion(version.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border border-red-900/50 bg-zinc-900 p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Danger zone
            </h2>
            <p className="mb-4 text-sm text-zinc-400">
              Deleting the project permanently removes it and all its versions.
            </p>
            <button
              onClick={deleteProject}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500"
            >
              Delete project
            </button>
          </section>
        </>
      )}
    </div>
  );
}

export default ProjectSettings;
