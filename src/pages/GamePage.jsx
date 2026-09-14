import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProjectIcon from "../components/ProjectIcon";

function GamePage() {
  const { gameSlug } = useParams();
  const [game, setGame] = useState(null);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("games")
      .select("*")
      .eq("slug", gameSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setGame(data);
      });

    supabase
      .from("projects")
      .select(
        `id,
         name,
         slug,
         summary,
         description,
         icon_url,
         download_count,
         games ( name, slug ),
         project_versions!project_versions_project_id_fkey ( version )`
      )
      .eq("games.slug", gameSlug)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          return;
        }
        setProjects(data);
      });

    return () => {
      cancelled = true;
    };
  }, [gameSlug]);

  if (notFound) {
    return <p className="p-12 text-center text-zinc-400">Game not found.</p>;
  }

  const q = search.trim().toLowerCase();
  const filteredProjects = q
    ? projects.filter((project) =>
        [project.name, project.slug, project.summary, project.description]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      )
    : projects;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <ProjectIcon
          url={game?.icon_url}
          name={game?.name}
          className="h-16 w-16 rounded-lg border border-zinc-700 text-2xl"
        />
        <div>
          <h1 className="text-3xl font-bold text-white">{game?.name}</h1>
          <p className="text-sm text-zinc-500">
            {projects.length} project(s)
          </p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search mods (e.g. sodium)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>

      {projects.length === 0 ? (
        <p className="text-zinc-400">No projects for this game yet.</p>
      ) : filteredProjects.length === 0 ? (
        <p className="text-zinc-400">No mods match &quot;{search}&quot;.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              to={`/games/${gameSlug}/${project.slug}`}
              className="flex gap-4 rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600"
            >
              <ProjectIcon
                url={project.icon_url}
                name={project.name}
                className="h-14 w-14 rounded-md border border-zinc-700"
              />
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {project.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {project.summary}
                </p>
                <small className="mt-2 block text-zinc-500">
                  {project.project_versions.length} version(s) •{" "}
                  {project.download_count ?? 0} downloads
                </small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default GamePage;
