import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import Markdown from "../components/Markdown";
import VersionForm from "../components/VersionForm";

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
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [descriptionTab, setDescriptionTab] = useState("edit");

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
          summary: data.summary ?? "",
          description: data.description ?? "",
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

  function handleIconChange(e) {
    const file = e.target.files[0] ?? null;
    setIconFile(file);

    if (!file) {
      setIconPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setIconPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function saveGeneral(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    let iconUrl = project.icon_url;

    if (iconFile) {
      const ext = iconFile.name.includes(".")
        ? iconFile.name.split(".").pop()
        : "png";
      const path = `${user.id}/${project.id}/icon-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("project-icons")
        .upload(path, iconFile);

      if (uploadError) {
        setSaving(false);
        setMessage({ type: "error", text: uploadError.message });
        return;
      }

      const { data: publicData } = supabase.storage
        .from("project-icons")
        .getPublicUrl(path);
      iconUrl = publicData.publicUrl;

      if (project.icon_url?.includes("/project-icons/")) {
        const oldPath = decodeURIComponent(
          project.icon_url.split("/project-icons/")[1]
        );
        supabase.storage.from("project-icons").remove([oldPath]);
      }
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        name: general.name,
        slug: general.slug,
        summary: general.summary || null,
        description: general.description,
        icon_url: iconUrl || null,
        visibility: general.visibility,
      })
      .eq("id", project.id);

    setSaving(false);

    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
      return;
    }

    setMessage({ type: "success", text: "Saved." });
    setProject((p) => ({ ...p, icon_url: iconUrl }));
    setIconFile(null);
    setIconPreview(null);

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
        <h1 className="text-2xl font-bold text-white">
          {project.name} — Settings
        </h1>
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
              <div className="flex items-center gap-4">
                <ProjectIcon
                  url={iconPreview ?? project.icon_url}
                  name={project.name}
                  className="h-20 w-20 rounded-lg border border-zinc-700 text-3xl"
                />
                <div>
                  <label className={labelClass}>Icon</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconChange}
                    className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Uploads on save. Leave empty to keep the current icon.
                  </p>
                </div>
              </div>
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
                <label className={labelClass}>Summary</label>
                <input
                  value={general.summary}
                  onChange={(e) => updateGeneral("summary", e.target.value)}
                  placeholder="A one-line resume of the project"
                  maxLength={255}
                  className={inputClass}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={labelClass}>Description</label>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setDescriptionTab("edit")}
                      className={`rounded px-2 py-1 ${
                        descriptionTab === "edit"
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionTab("preview")}
                      className={`rounded px-2 py-1 ${
                        descriptionTab === "preview"
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {descriptionTab === "edit" ? (
                  <>
                    <textarea
                      value={general.description}
                      onChange={(e) =>
                        updateGeneral("description", e.target.value)
                      }
                      rows={12}
                      placeholder={"# My mod\n\nDescribe your mod with **Markdown**..."}
                      className={`${inputClass} font-mono`}
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Markdown supported: **bold**, *italic*, # headings, - lists,
                      [links](https://...), `code`, tables.
                    </p>
                  </>
                ) : (
                  <div className="min-h-32 rounded border border-zinc-700 bg-zinc-950 px-3 py-2">
                    <Markdown text={general.description} />
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={labelClass}>Project type</label>
                  <input
                    value={project.project_type}
                    disabled
                    className={`${inputClass} cursor-not-allowed opacity-50`}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Project type can&apos;t be changed after creation.
                  </p>
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
