import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { FormSkeleton } from "../components/Skeletons";

function UserSettings() {
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          console.error("Failed to load profile:", fetchError);
          setError(fetchError.message);
        } else if (data) {
          setUsername(data.username ?? "");
          setDisplayName(data.display_name ?? "");
          setAvatarUrl(data.avatar_url ?? "");
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return <p className="p-12 text-center text-zinc-400">Loading…</p>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: username.trim() || null,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      },
      { onConflict: "id" }
    );

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    // Keep the auth user's metadata in sync so Supabase Auth also knows
    // the display name (used by e.g. email templates / admin panel).
    const { error: metaError } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() || null },
    });

    setSaving(false);

    if (metaError) {
      setError(`Profile saved, but auth metadata update failed: ${metaError.message}`);
      await refreshProfile(user.id);
      return;
    }

    await refreshProfile(user.id);
    setMessage("Settings saved.");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <FormSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">User settings</h1>

      {error && (
        <p className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded bg-green-900/50 p-3 text-sm text-green-200">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Email
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Display name
          <input
            type="text"
            placeholder="How your name appears across the site"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Username
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Avatar URL
          <input
            type="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>

        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Avatar preview"
            className="h-16 w-16 rounded-full object-cover"
          />
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-400">
        <Link to={`/users/${user.id}`} className="text-blue-400 hover:underline">
          View public profile
        </Link>
      </p>
    </div>
  );
}

export default UserSettings;
