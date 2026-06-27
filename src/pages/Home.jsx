import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Home() {
  const [mods, setMods] = useState([]);

  useEffect(() => {
    async function loadMods() {
      const { data, error } = await supabase
        .from("mods")
        .select("*");

      if (error) {
        console.error(error);
      } else {
        setMods(data);
      }
    }

    loadMods();
  }, []);

  return (
    <div>
      <p>Mod List</p>

      {mods.map((mod) => (
        <div key={mod.id}>
          <Link to={`/mods/${mod.slug}`}>
            <h2>{mod.name}</h2>
          </Link>

          <p>{mod.description}</p>
          <small>
            {mod.minecraft_version} • {mod.mod_loader}
          </small>
        </div>
      ))}
    </div>
  );
}

export default Home;