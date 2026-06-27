import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function ModPage() {
  const { slug } = useParams();
  const [mod, setMod] = useState(null);

  useEffect(() => {
    async function loadMod() {
      const { data } = await supabase
        .from("mods")
        .select("*")
        .eq("slug", slug)
        .single();

      setMod(data);
    }

    
    loadMod();
  }, [slug]);
  
  
  async function downloadMod() {
    const { data, error } = await supabase.storage
      .from("mod-files")
      .download(mod.download_url);

    if (error) {
      console.error(error);
      return;
    }

    const url = URL.createObjectURL(data);

    const a = document.createElement("a");
    a.href = url;
    a.download = mod.download_url;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (!mod) return <p>Loading...</p>;

  return (
    <>
      <h1>{mod.name}</h1>
      <p>{mod.description}</p>
      <button onClick={downloadMod}>
        Download
      </button>
    </>
  );
}

export default ModPage;