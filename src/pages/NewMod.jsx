import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function NewMod() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState(null);
  const [gamesError, setGamesError] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    game_id: "",
  });

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .order("name")
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setGamesError(fetchError.message);
        } else {
          setGames(data);
          if (data?.length > 0) {
            setForm((f) => ({ ...f, game_id: data[0].id }));
          }
        }
      });
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const { error: projectError } = await supabase.from("projects").insert({
      owner_id: user.id,
      game_id: form.game_id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      project_type: "mod",
      status: "published",
    });

    if (projectError) {
      setError(projectError.message);
      return;
    }

    navigate("/dashboard");
  }

  const labelClass = "mb-1 block text-sm font-medium text-zinc-300";
  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white";

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Create a Project</h1>

      {error && (
        <p className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {gamesError && (
        <p className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">
          Could not load games: {gamesError}
        </p>
      )}

      {games !== null && games.length === 0 && !gamesError && (
        <p className="mb-4 rounded bg-yellow-900/50 p-3 text-sm text-yellow-200">
          No games are available yet. A game must be added to the catalog
          before projects can be created for it.
        </p>
      )}

      {games === null && !gamesError && <p className="text-zinc-400">Loading games...</p>}

      {games !== null && games.length > 0 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="game_id" className={labelClass}>
              Game
            </label>
            <select
              id="game_id"
              name="game_id"
              value={form.game_id}
              onChange={handleChange}
              required
              className={inputClass}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              placeholder="My Cool Mod"
              value={form.name}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="slug" className={labelClass}>
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              placeholder="my-cool-mod"
              value={form.slug}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="What does your mod do?"
              value={form.description}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <button className="rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-500">
            Create Project
          </button>
        </form>
      )}

      {games !== null && games.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          You can publish versions with files from your dashboard afterwards.
        </p>
      )}
    </div>
  );
}

export default NewMod;
