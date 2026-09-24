import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import { FormSkeleton } from "../components/Skeletons";
import { formatDate } from "../lib/format";

const BIO_MAX = 160;

const GROUPS = [
  {
    label: "Account",
    tabs: [
      { id: "profile", label: "Profile" },
      { id: "security", label: "Account and security" },
    ],
  },
  {
    label: "Display",
    tabs: [{ id: "appearance", label: "Appearance" }],
  },
  {
    label: "Advanced",
    tabs: [{ id: "danger", label: "Danger zone" }],
  },
];

const APPEARANCE_KEY = "fw:appearance";

function loadAppearance() {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return { theme: "dark", reduceMotion: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { theme: "dark", reduceMotion: false };
}

function UserSettings() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");

  // Profile form
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [bioSupported, setBioSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Shared feedback (same pattern as ProjectSettings)
  const [message, setMessage] = useState(null);

  // Security form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Appearance (local, per-device)
  const [appearance, setAppearance] = useState(loadAppearance);
  const [deleting, setDeleting] = useState(false);

  // Apply persisted appearance side-effects.
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      appearance.reduceMotion
    );
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    } catch {
      /* ignore */
    }
  }, [appearance]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    // `bio` may not exist yet on older DBs (run
    // supabase/profiles_bio.sql). Fall back to the base columns so the
    // page still works without the migration.
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError && /bio/i.test(fetchError.message ?? "")) {
          supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle()
            .then(({ data: base, error: baseError }) => {
              if (cancelled) return;
              if (baseError) {
                console.error("Failed to load profile:", baseError);
                setMessage({ type: "error", text: baseError.message });
              } else if (base) {
                setUsername(base.username ?? "");
                setDisplayName(base.display_name ?? "");
                setAvatarUrl(base.avatar_url ?? "");
              }
              setBioSupported(false);
              setLoading(false);
            });
          return;
        }
        if (fetchError) {
          console.error("Failed to load profile:", fetchError);
          setMessage({ type: "error", text: fetchError.message });
        } else if (data) {
          setUsername(data.username ?? "");
          setDisplayName(data.display_name ?? "");
          setAvatarUrl(data.avatar_url ?? "");
          setBio(data.bio ?? "");
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

  function showMessage(type, text) {
    setMessage({ type, text });
  }

  function validateUsername(value) {
    const v = value.trim();
    if (!v) return "Username is required.";
    if (v.length < 3 || v.length > 32)
      return "Username must be between 3 and 32 characters.";
    if (!/^[a-zA-Z0-9_.-]+$/.test(v))
      return "Username may only contain letters, numbers, _, - and .";
    return null;
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setMessage(null);

    const usernameError = validateUsername(username);
    if (usernameError) {
      showMessage("error", usernameError);
      return;
    }
    if (bio.length > BIO_MAX) {
      showMessage("error", `Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }

    setSaving(true);
    const payload = {
      id: user.id,
      username: username.trim() || null,
      display_name: displayName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    };
    if (bioSupported) payload.bio = bio.trim() || null;

    const { error: saveError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (saveError) {
      // Column missing -> retry without bio and hide the field.
      if (bioSupported && /bio/i.test(saveError.message ?? "")) {
        const withoutBio = { ...payload };
        delete withoutBio.bio;
        const { error: retryError } = await supabase
          .from("profiles")
          .upsert(withoutBio, { onConflict: "id" });
        setSaving(false);
        if (retryError) {
          showMessage("error", retryError.message);
          return;
        }
        setBioSupported(false);
        await refreshProfile(user.id);
        showMessage(
          "success",
          "Settings saved. Bio is unavailable until supabase/profiles_bio.sql is run."
        );
        return;
      }
      setSaving(false);
      showMessage("error", saveError.message);
      return;
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() || null },
    });

    setSaving(false);

    if (metaError) {
      showMessage(
        "error",
        `Profile saved, but auth metadata update failed: ${metaError.message}`
      );
      await refreshProfile(user.id);
      return;
    }

    await refreshProfile(user.id);
    showMessage("success", "Profile saved.");
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploadingAvatar) return;
    setMessage(null);
    setUploadingAvatar(true);
    try {
      const ext = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
        : "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      setAvatarUrl(publicData.publicUrl);
      showMessage(
        "success",
        "Avatar uploaded. Save changes to apply it to your profile."
      );
    } catch (err) {
      showMessage(
        "error",
        err?.message ??
          "Avatar upload failed. Paste an image URL instead, or run supabase/profiles_bio.sql to create the avatars bucket."
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrl("");
    setMessage(null);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      showMessage("error", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage("error", "Passwords do not match.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setChangingPassword(false);
    if (error) {
      showMessage("error", error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    showMessage("success", "Password updated.");
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Delete your account? This permanently removes your projects, versions and profile. This cannot be undone."
      )
    ) {
      return;
    }
    if (
      window.prompt(
        `Type your username "${username || "confirm"}" to confirm deletion:`
      ) !== (username || "confirm")
    ) {
      return;
    }
    setDeleting(true);
    setMessage(null);
    try {
      const { error: projectsError } = await supabase
        .from("projects")
        .delete()
        .eq("owner_id", user.id);
      if (projectsError) throw projectsError;
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      if (profileError) throw profileError;
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      showMessage(
        "error",
        err?.message ?? "Failed to delete account. Please try again."
      );
      setDeleting(false);
    }
  }

  function clearLocalPreferences() {
    try {
      localStorage.removeItem(APPEARANCE_KEY);
    } catch {
      /* ignore */
    }
    setAppearance({ theme: "dark", reduceMotion: false });
    showMessage("success", "Local preferences cleared.");
  }

  const initial = (
    displayName.trim() ||
    username.trim() ||
    user.email ||
    "?"
  )
    .charAt(0)
    .toUpperCase();

  const labelClass = "mb-1 block text-sm font-medium text-zinc-300";
  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white";
  const helperClass = "mt-1 text-xs text-zinc-500";

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="h-48 shrink-0 rounded border border-zinc-800 bg-zinc-900 p-2 md:w-52" />
          <div className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 p-6">
            <FormSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {message && (
        <p
          className={`mb-6 rounded p-3 text-sm ${
            message.type === "error"
              ? "bg-red-900/50 text-red-200"
              : "bg-green-900/50 text-green-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        <nav
          aria-label="Settings sections"
          className="shrink-0 rounded border border-zinc-800 bg-zinc-900 p-2 md:w-52"
        >
          <div className="flex gap-1 overflow-x-auto md:flex-col">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {group.label}
                </p>
                {group.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMessage(null);
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={`block w-full whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium ${
                        isActive
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "profile" && (
            <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Profile
              </h2>
              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                <div>
                  <span className={labelClass}>Profile picture</span>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-20 w-20 shrink-0 rounded-full border border-zinc-700 object-cover"
                      />
                    ) : (
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-3xl font-semibold text-white">
                        {initial}
                      </span>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white">
                        {uploadingAvatar ? "Uploading…" : "Upload image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFile}
                          disabled={uploadingAvatar}
                          className="hidden"
                        />
                      </label>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-left text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="avatar-url">
                    Avatar URL
                  </label>
                  <input
                    id="avatar-url"
                    type="url"
                    placeholder="https://…"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className={inputClass}
                  />
                  <p className={helperClass}>
                    Upload an image or paste a URL. Leave empty to use your
                    initial.
                  </p>
                </div>

                <div>
                  <label className={labelClass} htmlFor="display-name">
                    Display name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    placeholder="How your name appears across the site"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                  />
                  <p className={helperClass}>
                    A unique name to identify your profile. Letters, numbers,
                    _, - and . only.
                  </p>
                </div>

                {bioSupported && (
                  <div>
                    <label className={labelClass} htmlFor="bio">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      maxLength={BIO_MAX}
                      placeholder="Tell everyone a little bit about you…"
                      className={inputClass}
                    />
                    <p className={helperClass}>
                      {bio.length}/{BIO_MAX}
                    </p>
                    <p className={helperClass}>
                      A short description shown on your public profile.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <Link
                    to={`/users/${user.id}`}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    View public profile
                  </Link>
                </div>
                <p className="text-xs text-zinc-500">
                  Your profile information is publicly viewable on FrostWolf.
                </p>
              </form>
            </section>
          )}

          {activeTab === "appearance" && (
            <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-1 text-lg font-semibold text-white">
                Appearance
              </h2>
              <p className="mb-4 text-sm text-zinc-500">
                How FrostWolf looks on this device. Preferences are stored
                locally.
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <span className={labelClass}>Theme</span>
                  <div className="flex gap-2">
                    {[
                      { id: "dark", label: "Dark" },
                      { id: "system", label: "System" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setAppearance((a) => ({ ...a, theme: t.id }))
                        }
                        aria-pressed={appearance.theme === t.id}
                        className={`rounded border px-4 py-2 text-sm ${
                          appearance.theme === t.id
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className={helperClass}>
                    FrostWolf is dark by default. System follows your OS
                    preference where supported.
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded border border-zinc-800 bg-zinc-950 p-3">
                  <input
                    type="checkbox"
                    checked={appearance.reduceMotion}
                    onChange={(e) =>
                      setAppearance((a) => ({
                        ...a,
                        reduceMotion: e.target.checked,
                      }))
                    }
                    className="mt-1 accent-blue-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">
                      Reduce animations
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      Disables transitions and skeleton shimmer on this
                      device.
                    </span>
                  </span>
                </label>
              </div>
            </section>
          )}

          {activeTab === "security" && (
            <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Account and security
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={user.email ?? ""}
                    disabled
                    className="w-full cursor-not-allowed rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-500"
                  />
                  <p className={helperClass}>
                    Email changes are handled through your sign-in provider.
                  </p>
                </div>

                <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
                  Member since {formatDate(user.created_at)} • Last sign in{" "}
                  {formatDate(user.last_sign_in_at)}
                </div>

                <form
                  onSubmit={handlePasswordChange}
                  className="flex flex-col gap-3 border-t border-zinc-800 pt-4"
                >
                  <h3 className="text-sm font-medium text-white">
                    Change password
                  </h3>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min. 8 characters)"
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <div>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {changingPassword ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {activeTab === "danger" && (
            <section className="rounded border border-red-900/50 bg-zinc-900 p-6">
              <h2 className="mb-2 text-lg font-semibold text-white">
                Danger zone
              </h2>
              <p className="mb-4 text-sm text-zinc-400">
                Deleting your account permanently removes your projects,
                versions and profile. This cannot be undone.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
                <button
                  type="button"
                  onClick={clearLocalPreferences}
                  className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  Clear local preferences
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
