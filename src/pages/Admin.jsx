import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const TABS = [
  { id: "queue", label: "Version queue" },
  { id: "reports", label: "Reports" },
  { id: "projects", label: "Projects" },
  { id: "users", label: "Users" },
];

function Admin() {
  const [tab, setTab] = useState("queue");
  const [message, setMessage] = useState(null);
  const [migrationMissing, setMigrationMissing] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold text-white">Admin moderation</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Version approval (virus check) • reports queue • manual per-project
        takedowns • user suspend flags. Admins are granted via SQL only.
      </p>

      {migrationMissing && (
        <p className="mt-4 rounded border border-amber-800 bg-amber-900/30 p-3 text-sm text-amber-200">
          The moderation migration hasn&apos;t been applied yet. Run{" "}
          <code className="font-mono">supabase/moderation.sql</code> in the
          Supabase SQL editor, then reload this page.
        </p>
      )}
      {message && (
        <p
          className={`mt-4 rounded p-3 text-sm ${
            message.type === "error"
              ? "bg-red-900/50 text-red-200"
              : "bg-green-900/50 text-green-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <nav
        aria-label="Admin sections"
        className="mt-6 flex gap-1 overflow-x-auto rounded border border-zinc-800 bg-zinc-900 p-2"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setMessage(null);
            }}
            aria-current={tab === t.id ? "page" : undefined}
            className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "queue" && (
          <VersionQueue
            onError={setMessage}
            onMissing={() => setMigrationMissing(true)}
          />
        )}
        {tab === "reports" && (
          <ReportsQueue
            onError={setMessage}
            onMissing={() => setMigrationMissing(true)}
          />
        )}
        {tab === "projects" && <ProjectsTable onError={setMessage} />}
        {tab === "users" && (
          <UsersTable
            onError={setMessage}
            onMissing={() => setMigrationMissing(true)}
          />
        )}
      </div>
    </div>
  );
}

function isMissingColumnError(err) {
  const s = `${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`;
  return /moderation_status|is_suspended|reports/i.test(s);
}

function VersionQueue({ onError, onMissing }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [actingId, setActingId] = useState(null);

  function load() {
    setLoading(true);
    supabase
      .from("project_versions")
      .select(
        "id, version, file_name, file_size, created_at, moderation_status, moderation_note, projects!inner ( id, name, slug, owner_id, games ( name, slug ) )"
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          if (isMissingColumnError(error)) onMissing();
          onError({ type: "error", text: error.message });
          return;
        }
        setRows(data ?? []);
      });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(version, decision) {
    const note = (notes[version.id] ?? "").trim();
    if (decision === "rejected" && !note) {
      onError({
        type: "error",
        text: "A rejection note is required so the owner knows why it stays hidden.",
      });
      return;
    }
    setActingId(version.id);
    const { error } = await supabase
      .from("project_versions")
      .update({
        moderation_status: decision,
        moderation_note: note || null,
      })
      .eq("id", version.id);
    setActingId(null);
    if (error) {
      onError({ type: "error", text: error.message });
      return;
    }
    setRows((r) => r.filter((x) => x.id !== version.id));
    onError({
      type: "success",
      text: `Version ${version.version} ${decision}.`,
    });
  }

  if (loading) return <p className="text-sm text-zinc-400">Loading queue…</p>;
  if (rows.length === 0)
    return <p className="text-sm text-zinc-400">Queue is clear. Nothing pending.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((v) => (
        <li
          key={v.id}
          className="rounded border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-white">
              {v.projects?.name} • {v.version}
            </p>
            <span className="text-xs text-zinc-500">
              {new Date(v.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {v.file_name ?? "no file"} •{" "}
            {v.file_size != null
              ? `${(v.file_size / 1024 / 1024).toFixed(2)} MB`
              : "size unknown"}
          </p>
          {v.projects?.slug && (
            <Link
              to={`/mods/${v.projects.slug}`}
              className="mt-1 inline-block text-sm text-blue-400 hover:underline"
            >
              Open project page
            </Link>
          )}
          <input
            value={notes[v.id] ?? ""}
            onChange={(e) =>
              setNotes((n) => ({ ...n, [v.id]: e.target.value }))
            }
            placeholder="Moderation note (required for rejection, shown to owner)"
            className="mt-3 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
          <div className="mt-3 flex gap-2">
            <button
              disabled={actingId === v.id}
              onClick={() => decide(v, "approved")}
              className="rounded bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-500 disabled:opacity-50"
            >
              Approve (goes public)
            </button>
            <button
              disabled={actingId === v.id}
              onClick={() => decide(v, "rejected")}
              className="rounded bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
            >
              Reject (stay hidden)
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReportsQueue({ onError, onMissing }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    supabase
      .from("reports")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          if (isMissingColumnError(error)) onMissing();
          onError({ type: "error", text: error.message });
          return;
        }
        setRows(data ?? []);
      });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve(report, status) {
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", report.id);
    if (error) {
      onError({ type: "error", text: error.message });
      return;
    }
    setRows((r) => r.filter((x) => x.id !== report.id));
    onError({ type: "success", text: `Report ${status}.` });
  }

  if (loading) return <p className="text-sm text-zinc-400">Loading reports…</p>;
  if (rows.length === 0)
    return <p className="text-sm text-zinc-400">No open reports.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-white">
            <span className="font-semibold">{r.target_type}</span> • {r.reason}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {new Date(r.created_at).toLocaleString()}
            {r.project_id ? ` • project ${r.project_id.slice(0, 8)}` : ""}
            {r.version_id ? ` • version ${r.version_id.slice(0, 8)}` : ""}
            {r.reported_user_id ? ` • user ${r.reported_user_id.slice(0, 8)}` : ""}
          </p>
          {r.details && (
            <p className="mt-2 text-sm text-zinc-300">{r.details}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => resolve(r, "dismissed")}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              Dismiss
            </button>
            <button
              onClick={() => resolve(r, "actioned")}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
            >
              Mark actioned (after manual takedown below)
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProjectsTable({ onError }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    if (e) e.preventDefault();
    setLoading(true);
    let query = supabase
      .from("projects")
      .select("id, name, slug, status, visibility, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      onError({ type: "error", text: error.message });
      return;
    }
    setRows(data ?? []);
  }

  async function setVisibility(project, visibility) {
    const { error } = await supabase
      .from("projects")
      .update({ visibility })
      .eq("id", project.id);
    if (error) {
      onError({ type: "error", text: error.message });
      return;
    }
    setRows((r) =>
      r.map((x) => (x.id === project.id ? { ...x, visibility } : x))
    );
    onError({
      type: "success",
      text: `${project.name} visibility -> ${visibility}.`,
    });
  }

  async function remove(project) {
    if (
      !window.confirm(
        `Delete "${project.name}" and all its versions? Manual takedown, cannot be undone.`
      )
    )
      return;
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);
    if (error) {
      onError({ type: "error", text: error.message });
      return;
    }
    setRows((r) => r.filter((x) => x.id !== project.id));
    onError({ type: "success", text: `${project.name} deleted.` });
  }

  return (
    <div>
      <form onSubmit={search} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects by name…"
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
          Search
        </button>
      </form>
      {loading ? (
        <p className="text-sm text-zinc-400">Searching…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/mods/${p.slug}`}
                  className="block truncate font-medium text-white hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {p.status} • {p.visibility} • owner{" "}
                  {p.owner_id?.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setVisibility(p, "private")}
                className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Hide (private)
              </button>
              <button
                onClick={() => setVisibility(p, "public")}
                className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Unhide (public)
              </button>
              <button
                onClick={() => remove(p)}
                className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UsersTable({ onError, onMissing }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reasons, setReasons] = useState({});

  async function search(e) {
    if (e) e.preventDefault();
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, username, display_name, is_suspended, suspended_reason")
      .order("created_at", { ascending: false })
      .limit(50);
    if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      if (isMissingColumnError(error)) onMissing();
      onError({ type: "error", text: error.message });
      return;
    }
    setRows(data ?? []);
  }

  async function setSuspended(profile, suspended) {
    const reason = (reasons[profile.id] ?? "").trim();
    if (suspended && !reason) {
      onError({ type: "error", text: "Suspension reason is required." });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: suspended,
        suspended_reason: suspended ? reason : null,
      })
      .eq("id", profile.id);
    if (error) {
      if (isMissingColumnError(error)) onMissing();
      onError({ type: "error", text: error.message });
      return;
    }
    setRows((r) =>
      r.map((x) =>
        x.id === profile.id
          ? {
              ...x,
              is_suspended: suspended,
              suspended_reason: suspended ? reason : null,
            }
          : x
      )
    );
    onError({
      type: "success",
      text: `${profile.username ?? profile.id} ${
        suspended ? "suspended" : "unsuspended"
      }. Takedowns remain manual per project.`,
    });
  }

  return (
    <div>
      <form onSubmit={search} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users by username…"
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
          Search
        </button>
      </form>
      {loading ? (
        <p className="text-sm text-zinc-400">Searching…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className="rounded border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-white">
                  {p.display_name?.trim() || p.username || p.id.slice(0, 8)}
                  {p.is_suspended && (
                    <span className="ml-2 rounded bg-red-900 px-2 py-0.5 text-xs text-red-200">
                      suspended
                    </span>
                  )}
                </p>
                <Link
                  to={`/users/${p.id}`}
                  className="text-xs text-blue-400 hover:underline"
                >
                  View profile
                </Link>
              </div>
              {p.suspended_reason && (
                <p className="mt-1 text-xs text-zinc-500">
                  Reason: {p.suspended_reason}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  value={reasons[p.id] ?? ""}
                  onChange={(e) =>
                    setReasons((m) => ({ ...m, [p.id]: e.target.value }))
                  }
                  placeholder="Suspension reason (required to suspend)"
                  className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-white"
                />
                {p.is_suspended ? (
                  <button
                    onClick={() => setSuspended(p, false)}
                    className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
                  >
                    Unsuspend
                  </button>
                ) : (
                  <button
                    onClick={() => setSuspended(p, true)}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Admin;
