import { useState } from "react";
import { supabase } from "../lib/supabase";
import Modal from "./Modal";
import Markdown from "./Markdown";

function EditChangelogModal({ version, onClose, onSaved }) {
  const [changelog, setChangelog] = useState(version.changelog ?? "");
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("project_versions")
      .update({ changelog: changelog.trim() ? changelog : null })
      .eq("id", version.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  const tabClass = (active) =>
    `rounded px-2 py-1 ${
      active ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
    }`;

  return (
    <Modal title={`Edit changelog — ${version.version}`} onClose={onClose}>
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {error && (
          <p className="rounded border border-red-800 bg-red-900/50 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={tabClass(tab === "edit")}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={tabClass(tab === "preview")}
          >
            Preview
          </button>
        </div>
        {tab === "edit" ? (
          <>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              rows={8}
              disabled={saving}
              placeholder="What changed in this version? Markdown supported."
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-white disabled:opacity-50"
            />
            <p className="text-xs text-zinc-500">
              Markdown supported: **bold**, *italic*, # headings, - lists,
              [links](https://...), `code`, tables.
            </p>
          </>
        ) : (
          <div className="min-h-24 rounded border border-zinc-700 bg-zinc-950 px-3 py-2">
            <Markdown text={changelog} emptyText="Nothing to preview yet." />
          </div>
        )}
        <div className="flex gap-2">
          <button
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changelog"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded border border-zinc-600 px-4 py-2 text-zinc-300 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditChangelogModal;
