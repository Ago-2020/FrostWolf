import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import VersionForm from "../components/VersionForm";

const VISIBILITIES = ["public", "unlisted", "private"];

function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [openVersionFor, setOpenVersionFor] = useState(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select("*, games ( name ), project_versions!project_versions_project_id_fkey ( id, version )")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          console.error(fetchError);
          return;
        }
        setProjects(data);
      });

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  function reloadProjects() {
    supabase
      .from("projects")
      .select("*, games ( name ), project_versions!project_versions_project_id_fkey ( id, version )")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error(fetchError);
          return;
        }
        setProjects(data);
      });
  }

  async function updateVisibility(projectId, visibility) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, visibility } : p))
    );

    const { error: updateError } = await supabase
      .from("projects")
      .update({ visibility })
      .eq("id", projectId);

    if (updateError) {
      console.error(updateError);
      reloadProjects();
    }
  }

  async function deleteProject(id) {
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(deleteError);
      return;
    }

    setProjects((prev) => prev.filter((project) => project.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <Link
          to="/mods/new"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-zinc-400">
          You haven&apos;t created any projects yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Link
                    to={`/mods/${project.slug}`}
                    className="text-lg font-semibold text-white hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-sm text-zinc-400">
                    {project.games?.name} •{" "}
                    {project.project_versions?.length ?? 0} version(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={project.visibility}
                    onChange={(e) =>
                      updateVisibility(project.id, e.target.value)
                    }
                    title="Visibility"
                    className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white"
                  >
                    {VISIBILITIES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setOpenVersionFor((prev) =>
                        prev === project.id ? null : project.id
                      )
                    }
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500"
                  >
                    {openVersionFor === project.id ? "Cancel" : "Add Version"}
                  </button>
                  <Link
                    to={`/mods/${project.slug}/settings`}
                    className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-300 hover:text-white"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {openVersionFor === project.id && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <VersionForm
                    projectId={project.id}
                    game_id={project.game_id}
                    onDone={() => {
                      setOpenVersionFor(null);
                      reloadProjects();
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Dashboard;
