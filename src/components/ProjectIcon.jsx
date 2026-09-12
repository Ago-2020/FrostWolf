import { useState } from "react";

function ProjectIcon({ url, name, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-zinc-800 text-zinc-400 ${className}`}
      >
        {(name ?? "?").charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name ?? ""}
      onError={() => setFailed(true)}
      className={`shrink-0 object-cover ${className}`}
    />
  );
}

export default ProjectIcon;
