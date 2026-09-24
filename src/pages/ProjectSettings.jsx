import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { extractYouTubeId } from "../lib/youtube";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import Markdown from "../components/Markdown";
import Modal from "../components/Modal";
import VersionForm from "../components/VersionForm";
import VersionMenu from "../components/VersionMenu";
import VersionFilters from "../components/VersionFilters";
import EditChangelogModal from "../components/EditChangelogModal";
import { FormSkeleton } from "../components/Skeletons";
import { formatDate, formatRelativeTime } from "../lib/format";
import { filterVersions } from "../lib/versionFilters";
import { downloadVersionFile } from "../lib/versionDownload";

const VISIBILITIES = ["public", "unlisted", "private"];

const TABS = [
  { id: "general", label: "General" },
  { id: "description", label: "Description" },
  { id: "gallery", label: "Gallery" },
  { id: "tags", label: "Tags" },
  { id: "versions", label: "Versions" },
  { id: "danger", label: "Danger Zone" },
];

function ProjectSettings() {
  const { slug } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [general, setGeneral] = useState(null);
  const [savedGeneral, setSavedGeneral] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [filterGameVersionId, setFilterGameVersionId] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [descriptionTab, setDescriptionTab] = useState("edit");
  const [activeTab, setActiveTab] = useState("general");
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [pendingTab, setPendingTab] = useState(null);
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

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
        "*, games ( name, slug ), project_versions!project_versions_project_id_fkey ( *, project_version_game_versions ( game_versions ( id, version, released_at ) ), project_version_loaders ( loaders ( id, name, slug ) ) )"
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
        "*, games ( name, slug ), project_versions!project_versions_project_id_fkey ( *, project_version_game_versions ( game_versions ( id, version, released_at ) ), project_version_loaders ( loaders ( id, name, slug ) ) )"
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

  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaLoading(true);
    supabase
      .from("project_media")
      .select("*")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        setMediaLoading(false);
        if (!error) setMedia(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  async function handleGalleryUpload(e) {
    const files = [...(e.target.files ?? [])];
    if (!files.length || !project || gallerySaving) return;
    setGallerySaving(true);
    setMessage(null);
    try {
      const base = media.length
        ? Math.max(...media.map((m) => m.sort_order ?? 0)) + 1
        : 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.includes(".")
          ? file.name.split(".").pop()
          : "png";
        const path = `${user.id}/${project.id}/gallery-${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-gallery")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage
          .from("project-gallery")
          .getPublicUrl(path);
        const { data, error: insertError } = await supabase
          .from("project_media")
          .insert({
            project_id: project.id,
            kind: "image",
            storage_path: path,
            image_url: publicData.publicUrl,
            sort_order: base + i,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        setMedia((m) => [...m, data]);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setGallerySaving(false);
      e.target.value = "";
    }
  }

  async function handleAddYouTube(e) {
    if (e) e.preventDefault();
    if (!project || gallerySaving || !youtubeUrl.trim()) return;
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      setMessage({ type: "error", text: "Could not parse a YouTube video ID from that URL." });
      return;
    }
    setGallerySaving(true);
    setMessage(null);
    const nextOrder = media.length
      ? Math.max(...media.map((m) => m.sort_order ?? 0)) + 1
      : 0;
    const { data, error } = await supabase
      .from("project_media")
      .insert({
        project_id: project.id,
        kind: "youtube",
        youtube_id: videoId,
        sort_order: nextOrder,
      })
      .select()
      .single();
    setGallerySaving(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMedia((m) => [...m, data]);
    setYoutubeUrl("");
  }

  async function handleDeleteMedia(item) {
    setMessage(null);
    const { error } = await supabase
      .from("project_media")
      .delete()
      .eq("id", item.id);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    if (item.kind === "image" && item.storage_path) {
      await supabase.storage.from("project-gallery").remove([item.storage_path]);
    }
    setMedia((m) => m.filter((x) => x.id !== item.id));
  }

  async function moveMedia(item, dir) {
    const sorted = [...media].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    const idx = sorted.findIndex((x) => x.id === item.id);
    const other = sorted[idx + dir];
    if (!other) return;
    setMessage(null);
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("project_media").update({ sort_order: other.sort_order ?? 0 }).eq("id", item.id),
      supabase.from("project_media").update({ sort_order: item.sort_order ?? 0 }).eq("id", other.id),
    ]);
    if (err1 || err2) {
      setMessage({ type: "error", text: (err1 ?? err2).message });
      return;
    }
    setMedia((m) =>
      m.map((x) =>
        x.id === item.id
          ? { ...x, sort_order: other.sort_order ?? 0 }
          : x.id === other.id
            ? { ...x, sort_order: item.sort_order ?? 0 }
            : x
      )
    );
  }

  async function updateCaption(item, caption) {
    const { error } = await supabase
      .from("project_media")
      .update({ caption: caption || null })
      .eq("id", item.id);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMedia((m) => m.map((x) => (x.id === item.id ? { ...x, caption } : x)));
  }

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

  async function deleteVersion(version) {
    if (
      !window.confirm(
        `Delete version "${version.version}"? Its file will be removed too.`
      )
    ) {
      return;
    }
    setOpenMenuId(null);

    const { error: deleteError } = await supabase
      .from("project_versions")
      .delete()
      .eq("id", version.id);

    if (deleteError) {
      setMessage({ type: "error", text: deleteError.message });
      return;
    }

    // Remove the storage file too (skip legacy external URLs).
    if (version.file_path && !/^https?:\/\//.test(version.file_path)) {
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([version.file_path]);
      if (storageError) {
        console.error("Failed to remove version file:", storageError);
      }
    }

    setMessage({ type: "success", text: `Version ${version.version} deleted.` });
    loadProject();
  }

  async function downloadVersion(version) {
    setDownloadingId(version.id);
    const { error } = await downloadVersionFile(version);
    setDownloadingId(null);
    setOpenMenuId(null);
    if (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  // Badge letter per release channel (R/B/A), styled like the site's
  // zinc icon fallback.
  function channelBadge(channel) {
    if (channel === "beta") {
      return "B";
    }
    if (channel === "alpha") {
      return "A";
    }
    return "R";
  }

  // Collapse the supported game versions into a single range label,
  // e.g. "1.20.1–1.20.6". Ordered by release date when known.
  function gameVersionRange(gameVersions) {
    if (gameVersions.length === 0) return null;
    const sorted = [...gameVersions].sort((a, b) => {
      if (a.released_at && b.released_at) {
        return new Date(a.released_at) - new Date(b.released_at);
      }
      return a.version.localeCompare(b.version, undefined, { numeric: true });
    });
    if (sorted.length === 1) return sorted[0].version;
    return `${sorted[0].version} - ${sorted[sorted.length - 1].version}`;
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
  const canEdit = isOwner || isAdmin;
  async function moderateVersion(version, decision, note) {
    if (decision === "rejected" && !(note ?? "").trim()) {
      setMessage({
        type: "error",
        text: "A rejection note is required so the owner knows why it stays hidden.",
      });
      return;
    }
    const { error } = await supabase
      .from("project_versions")
      .update({
        moderation_status: decision,
        moderation_note: (note ?? "").trim() || null,
      })
      .eq("id", version.id);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({
      type: "success",
      text: `Version ${version.version} ${decision}.`,
    });
    loadProject();
  }

  async function resubmitVersion(version) {
    const { error } = await supabase
      .from("project_versions")
      .update({ moderation_status: "pending" })
      .eq("id", version.id);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({
      type: "success",
      text: `Version ${version.version} resubmitted for review.`,
    });
    loadProject();
  }

  const labelClass = "mb-1 block text-sm font-medium text-zinc-300";
  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white";
  const visibleVersions = filterVersions(project.project_versions, {
    gameVersionId: filterGameVersionId,
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          {project.name}: Settings
        </h1>
        <Link
          to={`/mods/${project.slug}`}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Back to project
        </Link>
      </div>

      {!canEdit && (
        <p className="mb-6 rounded bg-yellow-900/50 p-3 text-sm text-yellow-200">
          Only the project owner or an admin can edit these settings.
        </p>
      )}
      {isAdmin && !isOwner && (
        <p className="mb-6 rounded border border-blue-900 bg-blue-950 p-3 text-sm text-blue-200">
          You are viewing as an admin. Changes are logged by moderation status.
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

      {canEdit && (
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

            {activeTab === "gallery" && (
              <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-1 text-lg font-semibold text-white">Gallery</h2>
                <p className="mb-4 text-sm text-zinc-500">
                  Images upload to gallery storage, YouTube videos are embedded
                  by URL. Changes save instantly and show on the project page.
                </p>

                <div className="mb-4 flex flex-col gap-3">
                  <div>
                    <label className={labelClass}>Upload images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      disabled={gallerySaving}
                      className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
                    />
                  </div>
                  <form onSubmit={handleAddYouTube} className="flex gap-2">
                    <input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="Paste YouTube URL (e.g. https://youtu.be/dQw4w9WgXcQ)"
                      className={inputClass}
                    />
                    <button
                      disabled={gallerySaving || !youtubeUrl.trim()}
                      className="shrink-0 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      Add video
                    </button>
                  </form>
                </div>

                {mediaLoading ? (
                  <p className="text-sm text-zinc-400">Loading gallery…</p>
                ) : media.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    No gallery items yet. Add screenshots or a trailer.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {[...media]
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-3 rounded border border-zinc-800 bg-zinc-950 p-3"
                        >
                          {item.kind === "youtube" ? (
                            <img
                              src={`https://i.ytimg.com/vi/${item.youtube_id}/mqdefault.jpg`}
                              alt=""
                              className="h-14 w-24 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <img
                              src={item.image_url}
                              alt=""
                              className="h-14 w-24 shrink-0 rounded object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs uppercase text-zinc-500">
                              {item.kind === "youtube"
                                ? `YouTube • ${item.youtube_id}`
                                : "Image"}
                            </p>
                            <input
                              defaultValue={item.caption ?? ""}
                              key={`${item.id}-${item.caption ?? ""}`}
                              onBlur={(e) => {
                                if (e.target.value !== (item.caption ?? "")) {
                                  updateCaption(item, e.target.value.trim());
                                }
                              }}
                              placeholder="Caption (optional)"
                              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white"
                            />
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => moveMedia(item, -1)}
                              aria-label="Move earlier"
                              className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => moveMedia(item, 1)}
                              aria-label="Move later"
                              className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
                            >
                              →
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(item)}
                              className="rounded bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
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
                    onClick={() => setShowVersionForm(true)}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
                  >
                    Add Version
                  </button>
                </div>

                {showVersionForm && (
                  <Modal
                    title={`Add version to ${project.name}`}
                    onClose={() => setShowVersionForm(false)}
                  >
                    <VersionForm
                      projectId={project.id}
                      game_id={project.game_id}
                      onDone={() => {
                        setShowVersionForm(false);
                        loadProject();
                      }}
                    />
                  </Modal>
                )}

                {project.project_versions.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    No versions published yet.
                  </p>
                ) : (
                  <>
                    <div className="mb-4">
                      <VersionFilters
                        versions={project.project_versions}
                        gameVersionId={filterGameVersionId}
                        onGameVersionChange={setFilterGameVersionId}
                        showLoader={false}
                      />
                      {(filterGameVersionId) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Showing {visibleVersions.length} of{" "}
                        {project.project_versions.length} versions.
                      </p>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_4.5rem_3.75rem_3.5rem] items-center gap-2 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        <span />
                        <span>Version</span>
                        <span>Game version</span>
                        <span>Platform</span>
                        <span>Published</span>
                        <span className="text-right">Downloads</span>
                        <span />
                      </div>
                      {visibleVersions.length === 0 ? (
                        <p className="px-2 py-4 text-sm text-zinc-400">
                          No versions match these filters.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {visibleVersions.map((version) => {
                            const badgeLetter = channelBadge(
                              version.release_channel
                            );
                            const gvList = (
                              version.project_version_game_versions ?? []
                            )
                              .map((x) => x.game_versions)
                              .filter(Boolean);
                            const loaders = (
                              version.project_version_loaders ?? []
                            )
                              .map((x) => x.loaders?.name)
                              .filter(Boolean);
                            const range = gameVersionRange(gvList);
                            return (
                              <li
                                key={version.id}
                                title={version.file_name ?? version.version}
                                className="rounded border border-zinc-800 bg-zinc-950 px-2 py-2"
                              >
                                <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_4.5rem_3.75rem_3.5rem] items-center gap-2">
                                <span
                                  title={version.release_channel}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300"
                                >
                                  {badgeLetter}
                                </span>
                                <span className="truncate font-semibold text-white">
                                  {version.version}
                                </span>
                                <span>
                                  {range ? (
                                    <span className="inline-block rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300">
                                      {range}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-zinc-600">
                                      -
                                    </span>
                                  )}
                                </span>
                                <span className="flex flex-wrap gap-1.5">
                                  {loaders.length > 0 ? (
                                    loaders.map((l) => (
                                      <span
                                        key={l}
                                        className="inline-block rounded-full border border-blue-900 bg-blue-950 px-2.5 py-0.5 text-xs text-blue-200"
                                      >
                                        {l}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-zinc-600">
                                      -
                                    </span>
                                  )}
                                </span>
                                <span
                                  title={formatDate(version.created_at)}
                                  className="text-sm text-zinc-400"
                                >
                                  {formatRelativeTime(version.created_at)}
                                </span>
                                <span className="text-right text-sm text-zinc-300">
                                  {version.download_count ?? 0}
                                </span>
                                <span className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingVersion(version)
                                    }
                                    aria-label={`Edit changelog for ${version.version}`}
                                    title="Edit changelog"
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={1.8}
                                      className="h-4 w-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                      />
                                    </svg>
                                  </button>
                                  <VersionMenu
                                    open={openMenuId === version.id}
                                    onToggle={() =>
                                      setOpenMenuId((prev) =>
                                        prev === version.id ? null : version.id
                                      )
                                    }
                                    onClose={() => setOpenMenuId(null)}
                                    onDownload={() => downloadVersion(version)}
                                    onDelete={() => deleteVersion(version)}
                                    downloading={downloadingId === version.id}
                                  />
                                </span>
                                </div>
                                {(version.moderation_status ||
                                  version.moderation_note) && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-2 text-xs">
                                    <span
                                      className={`rounded px-2 py-0.5 uppercase ${
                                        version.moderation_status ===
                                        "approved"
                                          ? "bg-green-900 text-green-200"
                                          : version.moderation_status ===
                                              "rejected"
                                            ? "bg-red-900 text-red-200"
                                            : "bg-amber-900 text-amber-200"
                                      }`}
                                    >
                                      {version.moderation_status ?? "pending"}
                                    </span>
                                    {version.moderation_note && (
                                      <span className="text-zinc-400">
                                        Note: {version.moderation_note}
                                      </span>
                                    )}
                                    {version.moderation_status ===
                                      "rejected" &&
                                      isOwner && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            resubmitVersion(version)
                                          }
                                          className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-zinc-500 hover:text-white"
                                        >
                                          Resubmit for review
                                        </button>
                                      )}
                                    {isAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            moderateVersion(
                                              version,
                                              "approved",
                                              version.moderation_note
                                            )
                                          }
                                          className="rounded bg-green-600 px-2 py-1 text-white hover:bg-green-500"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const note = window.prompt(
                                              "Rejection note (required, shown to owner):",
                                              version.moderation_note ?? ""
                                            );
                                            if (note === null) return;
                                            moderateVersion(
                                              version,
                                              "rejected",
                                              note
                                            );
                                          }}
                                          className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-500"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  </>
                )}

                {editingVersion && (
                  <EditChangelogModal
                    version={editingVersion}
                    onClose={() => setEditingVersion(null)}
                    onSaved={() => {
                      setEditingVersion(null);
                      setMessage({
                        type: "success",
                        text: "Changelog updated.",
                      });
                      loadProject();
                    }}
                  />
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
