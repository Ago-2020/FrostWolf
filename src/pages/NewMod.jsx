import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { FormSkeleton } from "../components/Skeletons";

function slugify(text) {
  return (text ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function NewMod() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState(null);
  const [gamesError, setGamesError] = useState(null);
  const [error, setError] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    summary: "",
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
    const { name, value } = e.target;
    if (name === "slug") {
      setSlugTouched(value !== "");
      setForm((f) => ({ ...f, slug: value }));
      return;
    }
    if (name === "name" && !slugTouched) {
      setForm((f) => ({ ...f, name: value, slug: slugify(value) }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!accepted) {
      setError("Please confirm you have the rights to share this and it follows the Community Rules.");
      return;
    }

    const slug = slugify(form.slug) || slugify(form.name);

    const { error: projectError } = await supabase.from("projects").insert({
      owner_id: user.id,
      game_id: form.game_id,
      name: form.name,
      slug,
      summary: form.summary,
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

      {games === null && !gamesError && <FormSkeleton rows={4} />}

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
            <label htmlFor="summary" className={labelClass}>
              Summary
            </label>
            <input
              id="summary"
              name="summary"
              placeholder="A one-line resume of your project"
              value={form.summary}
              onChange={handleChange}
              maxLength={255}
              required
              className={inputClass}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
            />
            <span>
              I have the rights to share this, it contains no malware, and it
              follows the{" "}
              <Link to="/rules" className="text-blue-400 hover:underline">
                Community Rules
              </Link>{" "}
              and{" "}
              <Link to="/terms" className="text-blue-400 hover:underline">
                Terms
              </Link>
              .
            </span>
          </label>
          <button
            disabled={!accepted}
            className="rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Project
          </button>
        </form>
      )}

      {games !== null && games.length > 0 && (
      <p className="mt-4 text-sm text-zinc-500">
        You can publish versions and write a full description from your
        dashboard afterwards.
      </p>
      )}
    </div>
  );
}

export default NewMod;
