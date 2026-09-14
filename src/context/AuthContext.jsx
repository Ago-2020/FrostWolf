import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data: p, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      // Log the full PostgREST body (message/hint/details) — a 400 here
      // almost always means the `profiles` table or one of these columns
      // doesn't exist yet. Run supabase/profiles.sql in the SQL editor.
      console.error("Failed to load profile:", error);
      setProfile(null);
      return;
    }
    if (!p) {
      // No row yet (e.g. user signed up before the handle_new_user
      // trigger existed). Create one so the rest of the app has
      // something to read; RLS policy "users can insert their own
      // profile" must allow id = auth.uid().
      const { error: insertError } = await supabase
        .from("profiles")
        .upsert({ id: userId }, { onConflict: "id" });
      if (insertError) {
        console.error("Failed to create missing profile:", insertError);
        setProfile(null);
        return;
      }
      // Re-read the row we just created.
      const { data: created, error: rereadError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (rereadError) {
        console.error("Failed to re-read profile:", rereadError);
        setProfile(null);
        return;
      }
      setProfile(created ?? null);
      return;
    }
    setProfile(p ?? null);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) refreshProfile(u.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        refreshProfile(u.id);
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}