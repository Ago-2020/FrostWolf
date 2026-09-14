import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function VersionForm({ projectId, game_id, onDone }) {
  const { user } = useAuth();
  const [loaders, setLoaders] = useState([]);
  const [gameVersions, setGameVersions] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    version: "",
    release_channel: "release",
    changelog: "",
    game_version_ids: [],
    loader_ids: [],
  });

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
      setLoaders(loadersRes.data ?? []);
      setGameVersions(versionsRes.data ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [game_id]);

  function updateForm(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleMultiSelect(name, e) {
    updateForm(name, Array.from(e.target.selectedOptions, (o) => o.value));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    let filePath = null;
    if (file) {
      filePath = `${user.id}/${projectId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);

      if (uploadError) {
        setError(uploadError.message);
        return;
      }
    }

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
      setError(versionError.message);
      return;
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
      if (gvError) console.error(gvError);
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
      if (loaderError) console.error(loaderError);
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <p className="rounded bg-red-900/50 p-3 text-sm text-red-200">
          {error}
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
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Channel
          </label>
          <select
            value={form.release_channel}
            onChange={(e) => updateForm("release_channel", e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          >
            <option value="release">Release</option>
            <option value="beta">Beta</option>
            <option value="alpha">Alpha</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Game versions
          </label>
          <select
            multiple
            size={Math.min(4, Math.max(1, gameVersions.length))}
            value={form.game_version_ids}
            onChange={(e) => handleMultiSelect("game_version_ids", e)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          >
            {gameVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.version}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Loaders
          </label>
          <select
            multiple
            size={Math.min(4, Math.max(1, loaders.length))}
            value={form.loader_ids}
            onChange={(e) => handleMultiSelect("loader_ids", e)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          >
            {loaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Changelog (optional)
        </label>
        <textarea
          value={form.changelog}
          onChange={(e) => updateForm("changelog", e.target.value)}
          rows={4}
          placeholder="What changed in this version? Markdown supported."
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          File (optional)
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Hold Ctrl/Cmd to select multiple game versions and loaders.
      </p>
      <button className="self-start rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
        Publish Version
      </button>
    </form>
  );
}

export default VersionForm;
