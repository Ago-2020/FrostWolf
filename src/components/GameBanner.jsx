import { useState } from "react";

// Banner image with graceful fallback. Renders `fallback` when there is no
// URL or the image fails to load (defaults to null = render nothing).
function GameBanner({
  url,
  name,
  className = "aspect-[4/1] w-full object-cover",
  fallback = null,
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) return fallback;

  return (
    <img
      src={url}
      alt={`${name ?? "Game"} banner`}
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}

export default GameBanner;
