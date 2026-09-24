import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import Markdown from "./Markdown";

const CHECK = "\u2713";

function CheckboxPills({
  items,
  selectedIds,
  onToggle,
  renderLabel,
  emptyText,
  loading,
  disabled,
}) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Loading...</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selectedIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onToggle(item.id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              active
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {active ? `${CHECK} ` : ""}
            {renderLabel(item)}
          </button>
        );
      })}
    </div>
  );
}

function VersionForm({ projectId, game_id, onDone }) {
  const { user } = useAuth();
  const [loaders, setLoaders] = useState([]);
  const [gameVersions, setGameVersions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | uploading | saving | linking | done
  const [changelogTab, setChangelogTab] = useState("edit");
  const [form, setForm] = useState({
    version: "",
    release_channel: "release",
    changelog: "",
    game_version_ids: [],
    loader_ids: [],
  });

  const busy =
    status === "uploading" || status === "saving" || status === "linking";

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      supabase.from("loaders").select("*").eq("game_id", game_id).order("name"),
      supabase
        .from("game_versions")
        .select("*")
        .eq("game_id", game_id)
        .order("released_at", { ascending: false }),
    ]).then(([loadersRes, versionsRes]) => {
      if (cancelled) return;
      if (loadersRes.error) console.error(loadersRes.error);
      if (versionsRes.error) console.error(versionsRes.error);
      setLoaders(loadersRes.data ?? []);
      setGameVersions(versionsRes.data ?? []);
      setLoadingOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [game_id]);

  function updateForm(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleId(name, id) {
    setForm((f) => {
      const list = f[name].includes(id)
        ? f[name].filter((x) => x !== id)
        : [...f[name], id];
      return { ...f, [name]: list };
    });
  }

  function statusLabel() {
    switch (status) {
      case "uploading":
        return "Uploading file...";
      case "saving":
        return "Creating version...";
      case "linking":
        return "Linking game versions...";
      case "done":
        return `Published ${CHECK}`;
      default:
        return "Publish Version";
    }
  }

  function statusMessage() {
    switch (status) {
      case "uploading":
        return "Uploading file to storage...";
      case "saving":
        return "Creating version record...";
      case "linking":
        return "Linking game versions and loaders...";
      default:
        return null;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user?.id) {
      setError("You must be logged in to publish a version.");
      return;
    }

    if (!accepted) {
      setError("Please confirm you have the rights to share this file and it follows the Community Rules.");
      return;
    }

    let filePath = null;
    try {
      if (file) {
        setStatus("uploading");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        filePath = `${user.id}/${projectId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;
      }

      setStatus("saving");
      const { data: version, error: versionError } = await supabase
        .from("project_versions")
        .insert({
          project_id: projectId,
          version: form.version,
          release_channel: form.release_channel,
          changelog: form.changelog?.trim() ? form.changelog : null,
          file_path: filePath,
          file_name: file?.name ?? null,
          file_size: file?.size ?? null,
        })
        .select()
        .single();

      if (versionError) {
        // Avoid orphan files when the DB row is rejected (e.g. RLS).
        if (filePath) {
          await supabase.storage.from("project-files").remove([filePath]);
        }
        throw versionError;
      }

      if (form.game_version_ids.length > 0 || form.loader_ids.length > 0) {
        setStatus("linking");
      }

      if (form.game_version_ids.length > 0) {
        const { error: gvError } = await supabase
          .from("project_version_game_versions")
          .insert(
            form.game_version_ids.map((game_version_id) => ({
              project_version_id: version.id,
              game_version_id,
            }))
          );
        if (gvError) throw gvError;
      }

      if (form.loader_ids.length > 0) {
        const { error: loaderError } = await supabase
          .from("project_version_loaders")
          .insert(
            form.loader_ids.map((loader_id) => ({
              project_version_id: version.id,
              loader_id,
            }))
          );
        if (loaderError) throw loaderError;
      }

      setStatus("done");
      setSuccess(
        `Version ${form.version} published successfully${
          file ? ` (${file.name})` : ""
        }.`
      );
      // Let the user see the confirmation before the parent closes the modal.
      setTimeout(onDone, 1200);
    } catch (err) {
      console.error("Version publish failed:", err);
      setError(err.message ?? "Failed to publish version.");
      setStatus("idle");
    }
  }

  const busyMessage = statusMessage();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <p className="rounded border border-red-800 bg-red-900/50 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded border border-green-800 bg-green-900/50 p-3 text-sm text-green-200">
          {success}
        </p>
      )}
      {busyMessage && (
        <p className="text-sm text-blue-300" role="status" aria-live="polite">
          {busyMessage}
        </p>
      )}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Version
          </label>
          <input
            name="version"
            placeholder="e.g. 1.0.0"
            value={form.version}
            onChange={(e) => updateForm("version", e.target.value)}
            required
            disabled={busy}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Channel
          </label>
          <select
            value={form.release_channel}
            onChange={(e) => updateForm("release_channel", e.target.value)}
            disabled={busy}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
          >
            <option value="release">Release</option>
            <option value="beta">Beta</option>
            <option value="alpha">Alpha</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            Game versions{" "}
            <span className="font-normal text-zinc-500">
              ({form.game_version_ids.length} selected)
            </span>
          </span>
          <CheckboxPills
            items={gameVersions}
            selectedIds={form.game_version_ids}
            onToggle={(id) => toggleId("game_version_ids", id)}
            renderLabel={(v) => v.version}
            loading={loadingOptions}
            disabled={busy}
            emptyText="No game versions listed for this game yet."
          />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            Loaders{" "}
            <span className="font-normal text-zinc-500">
              ({form.loader_ids.length} selected)
            </span>
          </span>
          <CheckboxPills
            items={loaders}
            selectedIds={form.loader_ids}
            onToggle={(id) => toggleId("loader_ids", id)}
            renderLabel={(l) => l.name}
            loading={loadingOptions}
            disabled={busy}
            emptyText="No loaders listed for this game yet."
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-300">
            Changelog (optional)
          </label>
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setChangelogTab("edit")}
              className={`rounded px-2 py-1 ${
                changelogTab === "edit"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setChangelogTab("preview")}
              className={`rounded px-2 py-1 ${
                changelogTab === "preview"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Preview
            </button>
          </div>
        </div>
        {changelogTab === "edit" ? (
          <>
            <textarea
              value={form.changelog}
              onChange={(e) => updateForm("changelog", e.target.value)}
              rows={4}
              disabled={busy}
              placeholder="What changed in this version? Markdown supported."
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-white disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Markdown supported: **bold**, *italic*, # headings, - lists,
              [links](https://...), `code`, tables.
            </p>
          </>
        ) : (
          <div className="min-h-24 rounded border border-zinc-700 bg-zinc-950 px-3 py-2">
            <Markdown text={form.changelog} emptyText="Nothing to preview yet." />
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          File (optional)
        </label>
        <input
          type="file"
          disabled={busy}
          onChange={(e) => setFile(e.target.files[0] ?? null)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        />
        {file && (
          <p className="mt-1 text-xs text-zinc-400">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          required
          disabled={busy}
          className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600 disabled:opacity-50"
        />
        <span>
          I have the rights to share this file, it contains no malware, and
          it follows the{" "}
          <a href="/rules" className="text-blue-400 hover:underline">
            Community Rules
          </a>
          .
        </span>
      </label>
      <button
        disabled={busy || status === "done" || !accepted}
        className="self-start rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {statusLabel()}
      </button>
    </form>
  );
}

export default VersionForm;
