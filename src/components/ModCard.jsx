import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProjectIcon from "./ProjectIcon";

const TOOLTIP_WIDTH = 288 + 12; // w-72 + gap

function ModCard({ project, author, gameSlug }) {
  const navigate = useNavigate();
  const [side, setSide] = useState("right");

  const projectTags = (project.project_tags ?? [])
    .map((pt) => pt.tags)
    .filter(Boolean);
  const supportedGameVersions = [
    ...new Set(
      (project.project_versions ?? [])
        .flatMap((v) =>
          (v.project_version_game_versions ?? []).map(
            (x) => x.game_versions?.version
          )
        )
        .filter(Boolean)
    ),
  ].slice(0, 3);
  const supportedLoaders = [
    ...new Set(
      (project.project_versions ?? [])
        .flatMap((v) =>
          (v.project_version_loaders ?? []).map((x) => x.loaders?.name)
        )
        .filter(Boolean)
    ),
  ].slice(0, 3);

  // Pick the tooltip side from the card's real viewport position, so it
  // never runs off-screen regardless of grid columns or window size.
  function handleMouseEnter(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setSide(rect.right + TOOLTIP_WIDTH > window.innerWidth ? "left" : "right");
  }

  return (
    <div
      onClick={() => navigate(`/games/${gameSlug}/${project.slug}`)}
      onMouseEnter={handleMouseEnter}
      className="group relative cursor-pointer rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t bg-zinc-800">
        <ProjectIcon
          url={project.icon_url}
          name={project.name}
          className="absolute inset-0 h-full w-full text-4xl"
        />
      </div>
      <div className="p-4">
        <h2 className="truncate text-lg font-semibold text-white">
          {project.name}
        </h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
          {author?.avatar_url && (
            <img
              src={author.avatar_url}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
            />
          )}
          <span>
            by{" "}
            {author ? (
              <Link
                to={`/users/${project.owner_id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-400 hover:text-white hover:underline"
              >
                {author.username}
              </Link>
            ) : (
              "unknown"
            )}
          </span>
        </p>
        <small className="mt-2 block text-zinc-500">
          {(project.project_versions ?? []).length} version(s) •{" "}
          {project.download_count ?? 0} downloads
          {supportedGameVersions.length > 0 &&
            ` • ${supportedGameVersions.join(", ")}`}
          {supportedLoaders.length > 0 && ` • ${supportedLoaders.join(", ")}`}
        </small>
      </div>
      <div
        className={`pointer-events-none invisible absolute top-1/2 z-30 hidden w-72 -translate-y-1/2 rounded-lg border border-zinc-700 bg-zinc-950 p-4 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100 group-hover:delay-300 lg:block ${
          side === "right" ? "left-full ml-3" : "right-full mr-3"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Summary
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          {project.summary || "No summary provided."}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Tags
        </p>
        {projectTags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {projectTags.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">No tags.</p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Created{" "}
          {project.created_at
            ? new Date(project.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "unknown"}
        </p>
      </div>
    </div>
  );
}

export default ModCard;
