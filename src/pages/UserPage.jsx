import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ProjectIcon from "../components/ProjectIcon";
import { UserPageSkeleton } from "../components/Skeletons";

function UserPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    setProjects([]);
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", id)
        .maybeSingle(),
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
        .eq("owner_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([profileRes, projectsRes]) => {
      if (cancelled) return;
      if (profileRes.error) {
        console.error("Failed to load profile:", profileRes.error);
        setNotFound(true);
      } else if (!profileRes.data) {
        setNotFound(true);
      } else {
        setProfile(profileRes.data);
      }
      if (projectsRes.error) {
        console.error(projectsRes.error);
      } else {
        setProjects(projectsRes.data ?? []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <UserPageSkeleton />;
  }

  if (notFound) {
    return <p className="p-12 text-center text-zinc-400">User not found.</p>;
  }

  const displayName =
    profile?.display_name?.trim() || profile?.username || "Unknown user";
  const isOwner = user?.id === id;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-2xl font-semibold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          {profile?.username &&
            profile.display_name?.trim() &&
            profile.display_name.trim() !== profile.username && (
              <p className="text-sm text-zinc-500">@{profile.username}</p>
            )}
          <p className="text-sm text-zinc-500">
            {projects.length} public project(s)
          </p>
        </div>
        {isOwner && (
          <Link
            to="/settings"
            className="shrink-0 rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:text-white"
          >
            User settings
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-zinc-400">This user has no public projects yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/games/${project.games?.slug}/${project.slug}`}
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
                  {project.games?.name} • {project.project_versions.length}{" "}
                  version(s) • {project.download_count ?? 0} downloads
                </small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserPage;
