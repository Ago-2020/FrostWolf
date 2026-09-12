import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ProjectIcon from "../components/ProjectIcon";

function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("games")
      .select("id, name, slug, icon_url")
      .order("name")
      .then(({ data }) => {
        if (cancelled) return;
        setGames(data ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const q = search.trim().toLowerCase();
  const filteredGames = q
    ? games.filter(
        (g) => g.name.toLowerCase().includes(q) || g.slug.includes(q)
      )
    : games;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold text-white">Browse Games</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search games (e.g. minecraft)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>

      <p className="mb-4 text-sm text-zinc-400">
        {filteredGames.length} game(s)
      </p>

      {filteredGames.length === 0 ? (
        <p className="text-zinc-400">
          {q ? `No games match "${search}".` : "No games yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {filteredGames.map((g) => (
            <Link
              key={g.id}
              to={`/games/${g.slug}`}
              className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600"
            >
              <ProjectIcon
                url={g.icon_url}
                name={g.name}
                className="h-10 w-10 rounded-md border border-zinc-700"
              />
              <div>
                <p className="font-semibold text-white">{g.name}</p>
                <p className="text-xs text-zinc-500">/games/{g.slug}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
