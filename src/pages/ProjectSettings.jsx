import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import Markdown from "../components/Markdown";
import VersionForm from "../components/VersionForm";
import { FormSkeleton } from "../components/Skeletons";

const VISIBILITIES = ["public", "unlisted", "private"];

const TABS = [
  { id: "general", label: "General" },
  { id: "description", label: "Description" },
  { id: "tags", label: "Tags" },
  { id: "versions", label: "Versions" },
  { id: "danger", label: "Danger Zone" },
];

function ProjectSettings() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [general, setGeneral] = useState(null);
  const [savedGeneral, setSavedGeneral] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [descriptionTab, setDescriptionTab] = useState("edit");
  const [activeTab, setActiveTab] = useState("general");
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [pendingTab, setPendingTab] = useState(null);

  // Tracks whether the form differs from the last saved state, so we can
  // warn before discarding edits (tab switch, in-app navigation, tab close).
  const isDirtyRef = useRef(false);
  const bypassBlockRef = useRef(false);

  const isDirty = useMemo(() => {
    if (!general || !savedGeneral) return false;
    if (iconFile) return true;
    return (
      general.name !== savedGeneral.name ||
      general.slug !== savedGeneral.slug ||
      (general.summary ?? "") !== (savedGeneral.summary ?? "") ||
      (general.description ?? "") !== (savedGeneral.description ?? "") ||
      (general.icon_url ?? "") !== (savedGeneral.icon_url ?? "") ||
      general.visibility !== savedGeneral.visibility
    );
  }, [general, savedGeneral, iconFile]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Block in-app navigation (Back to project, nav links, browser back)
  // while there are unsaved settings edits.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (bypassBlockRef.current) return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      return isDirtyRef.current;
    }
  );
  const isNavigationBlocked = blocker.state === "blocked";

  // Warn on browser refresh / tab close with unsaved edits. Browsers only
  // show a generic leave confirmation here (no custom Save button).
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

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
        const snapshot = {
          name: data.name,
          slug: data.slug,
          summary: data.summary ?? "",
          description: data.description ?? "",
          icon_url: data.icon_url ?? "",
          visibility: data.visibility,
        };
        setGeneral(snapshot);
        setSavedGeneral(snapshot);
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

  useEffect(() => {
    if (!project?.id || !project?.game_id) return;
    let cancelled = false;

    Promise.all([
      supabase
        .from("tags")
        .select("id, name, slug")
        .eq("game_id", project.game_id)
        .order("name"),
      supabase
        .from("project_tags")
        .select("tag_id")
        .eq("project_id", project.id),
    ]).then(([tagsRes, ptRes]) => {
      if (cancelled) return;
      if (!tagsRes.error) setAllTags(tagsRes.data ?? []);
      if (!ptRes.error)
        setSelectedTagIds((ptRes.data ?? []).map((r) => r.tag_id));
    });

    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.game_id]);

  async function toggleProjectTag(tagId) {
    const selected = selectedTagIds.includes(tagId);
    setSelectedTagIds((s) =>
      selected ? s.filter((id) => id !== tagId) : [...s, tagId]
    );
    setMessage(null);

    if (selected) {
      const { error } = await supabase
        .from("project_tags")
        .delete()
        .eq("project_id", project.id)
        .eq("tag_id", tagId);
      if (error) {
        setSelectedTagIds((s) => [...s, tagId]);
        setMessage({ type: "error", text: error.message });
      }
    } else {
      const { error } = await supabase
        .from("project_tags")
        .insert({ project_id: project.id, tag_id: tagId });
      if (error) {
        setSelectedTagIds((s) => s.filter((id) => id !== tagId));
        setMessage({ type: "error", text: error.message });
      }
    }
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
    if (e) e.preventDefault();
    if (!project || !general || saving) return false;
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
        return false;
      }

      const { data: publicData } = supabase.storage
        .from("project-icons")
        .getPublicUrl(path);
      iconUrl = publicData.publicUrl;

      if (project.icon_url?.includes("/project-icons/")) {
        const oldPath = decodeURIComponent(
          project.icon_url.split("/project-icons/")[1]
        );
        await supabase.storage.from("project-icons").remove([oldPath]);
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
      return false;
    }

    const snapshot = {
      name: general.name,
      slug: general.slug,
      summary: general.summary || "",
      description: general.description,
      icon_url: iconUrl ?? "",
      visibility: general.visibility,
    };
    setMessage({ type: "success", text: "Saved." });
    setSavedGeneral(snapshot);
    setGeneral(snapshot);
    setProject((p) => ({ ...p, icon_url: iconUrl }));
    setIconFile(null);
    setIconPreview(null);
    isDirtyRef.current = false;

    if (general.slug !== slug) {
      setProject((p) => ({ ...p, slug: general.slug }));
      // Internal redirect after a slug rename shouldn't trip the guard:
      // the form was just saved, so allow this navigation through.
      bypassBlockRef.current = true;
      navigate(`/mods/${general.slug}/settings`, { replace: true });
      bypassBlockRef.current = false;
    }

    return true;
  }

  function requestTabChange(next) {
    if (next === activeTab) return;
    if (isDirtyRef.current) {
      setPendingTab(next);
      return;
    }
    setActiveTab(next);
  }

  function discardPendingTab() {
    if (savedGeneral) setGeneral({ ...savedGeneral });
    setIconFile(null);
    setIconPreview(null);
    isDirtyRef.current = false;
    setActiveTab(pendingTab);
    setPendingTab(null);
  }

  async function savePendingTab() {
    const ok = await saveGeneral();
    if (ok) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }

  async function saveAndProceed() {
    const ok = await saveGeneral();
    if (ok) {
      isDirtyRef.current = false;
      blocker.proceed();
    }
  }

  function discardAndProceed() {
    // Leave without saving; form state is discarded with the unmount.
    blocker.proceed();
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
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-6 py-12" aria-hidden>
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-64 rounded bg-zinc-800" />
          <div className="h-4 w-28 rounded bg-zinc-800" />
        </div>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="h-48 shrink-0 rounded border border-zinc-800 bg-zinc-900 p-2 md:w-52" />
          <div className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 p-6">
            <FormSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === project.owner_id;
  const labelClass = "mb-1 block text-sm font-medium text-zinc-300";
  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
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
        <div className="flex flex-col gap-6 md:flex-row">
          <nav
            aria-label="Settings sections"
            className="flex shrink-0 gap-1 overflow-x-auto rounded border border-zinc-800 bg-zinc-900 p-2 md:w-52 md:flex-col"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => requestTabChange(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium ${
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {isActive && isDirty && (
                    <span
                      title="Unsaved changes"
                      aria-label="Unsaved changes"
                      className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1">
            {activeTab === "general" && (
              <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
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
                  <div className="flex items-center gap-3">
                    <button
                      disabled={saving}
                      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    {isDirty && !saving && (
                      <span className="text-sm text-amber-300">
                        You have unsaved changes.
                      </span>
                    )}
                  </div>
                </form>
              </section>
            )}

            {activeTab === "description" && (
              <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Description
                </h2>
                <form onSubmit={saveGeneral} className="flex flex-col gap-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className={labelClass}>Content</label>
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
                          placeholder={
                            "# My mod\n\nDescribe your mod with **Markdown**..."
                          }
                          className={`${inputClass} font-mono`}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Markdown supported: **bold**, *italic*, # headings, -
                          lists, [links](https://...), `code`, tables.
                        </p>
                      </>
                    ) : (
                      <div className="min-h-32 rounded border border-zinc-700 bg-zinc-950 px-3 py-2">
                        <Markdown text={general.description} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={saving}
                      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    {isDirty && !saving && (
                      <span className="text-sm text-amber-300">
                        You have unsaved changes.
                      </span>
                    )}
                  </div>
                </form>
              </section>
            )}

            {activeTab === "tags" && (
              <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-1 text-lg font-semibold text-white">Tags</h2>
                <p className="mb-4 text-sm text-zinc-500">
                  Pick from the existing tags for this game. Changes save
                  instantly. New tags are curated by admins.
                </p>
                {allTags.length === 0 ? (
                  <p className="mb-4 text-sm text-zinc-400">
                    No tags exist for this game yet.
                  </p>
                ) : (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      const active = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleProjectTag(tag.id)}
                          className={`rounded-full border px-3 py-1 text-sm ${
                            active
                              ? "border-blue-500 bg-blue-600 text-white"
                              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === "versions" && (
              <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
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
                  <p className="text-sm text-zinc-400">
                    No versions published yet.
                  </p>
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
            )}

            {activeTab === "danger" && (
              <section className="rounded border border-red-900/50 bg-zinc-900 p-6">
                <h2 className="mb-2 text-lg font-semibold text-white">
                  Danger zone
                </h2>
                <p className="mb-4 text-sm text-zinc-400">
                  Deleting the project permanently removes it and all its
                  versions.
                </p>
                <button
                  onClick={deleteProject}
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                >
                  Delete project
                </button>
              </section>
            )}
          </div>
        </div>
      )}

      {(pendingTab || isNavigationBlocked) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="unsaved-changes-title"
          aria-describedby="unsaved-changes-desc"
        >
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            <h2
              id="unsaved-changes-title"
              className="text-lg font-semibold text-white"
            >
              Save your changes?
            </h2>
            <p id="unsaved-changes-desc" className="mt-2 text-sm text-zinc-400">
              {isNavigationBlocked
                ? "You have unsaved settings changes. Do you want to save them before leaving this page?"
                : "You have unsaved settings changes. Do you want to save them before switching sections?"}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (isNavigationBlocked) blocker.reset();
                  else setPendingTab(null);
                }}
                className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (isNavigationBlocked) discardAndProceed();
                  else discardPendingTab();
                }}
                className="rounded border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-200 hover:bg-red-900 disabled:opacity-50"
              >
                Discard changes
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (isNavigationBlocked) saveAndProceed();
                  else savePendingTab();
                }}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSettings;
