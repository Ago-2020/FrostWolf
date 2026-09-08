import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function versionLoaders(project) {
  const names = new Set();
  for (const version of project.project_versions ?? []) {
    for (const link of version.project_version_loaders ?? []) {
      if (link.loaders) names.add(link.loaders.name);
    }
  }
  return [...names];
}

function versionGameVersions(project) {
  const names = new Set();
  for (const version of project.project_versions ?? []) {
    for (const link of version.project_version_game_versions ?? []) {
      if (link.game_versions) names.add(link.game_versions.version);
    }
  }
  return [...names];
}

function Home() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("All");
  const [loader, setLoader] = useState("All");
  const [gameVersion, setGameVersion] = useState("All");

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select(
        `id,
         name,
         slug,
         description,
         games ( name, slug ),
         project_versions!project_versions_project_id_fkey (
           version,
           project_version_loaders ( loaders ( name, slug ) ),
           project_version_game_versions ( game_versions ( version ) )
         )`
      )
      .order("created_at", { ascending: false })
      .eq("visibility", "public")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
        } else {
          setProjects(data);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = projects.filter((project) => {
    const q = search.toLowerCase();
    const matchesSearch =
      project.name.toLowerCase().includes(q) ||
      (project.description ?? "").toLowerCase().includes(q);
    const matchesGame = game === "All" || project.games?.slug === game;
    const matchesLoader =
      loader === "All" || versionLoaders(project).includes(loader);
    const matchesVersion =
      gameVersion === "All" || versionGameVersions(project).includes(gameVersion);
    return matchesSearch && matchesGame && matchesLoader && matchesVersion;
  });

  const gameNames = [
    ...new Set(projects.map((p) => p.games?.name).filter(Boolean)),
  ];
  const loaderNames = [...new Set(projects.flatMap(versionLoaders))];
  const versionNames = [...new Set(projects.flatMap(versionGameVersions))];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-white">Browse Projects</h1>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
        <select
          value={game}
          onChange={(e) => setGame(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        >
          <option value="All">All games</option>
          {gameNames.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={loader}
          onChange={(e) => setLoader(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        >
          <option value="All">All loaders</option>
          {loaderNames.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={gameVersion}
          onChange={(e) => setGameVersion(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        >
          <option value="All">All versions</option>
          {versionNames.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-sm text-zinc-400">{filtered.length} projects</p>

      {filtered.length === 0 ? (
        <p className="text-zinc-400">No projects match your filters.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/mods/${project.slug}`}
              className="rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600"
            >
              <h2 className="text-lg font-semibold text-white">
                {project.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{project.description}</p>
              <small className="mt-2 block text-zinc-500">
                {project.games?.name}
                {versionGameVersions(project).length > 0 &&
                  ` • ${versionGameVersions(project).join(", ")}`}
                {versionLoaders(project).length > 0 &&
                  ` • ${versionLoaders(project).join(", ")}`}
              </small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
