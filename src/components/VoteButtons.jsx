function ThumbUp({ solid, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 10v11H4a1 1 0 01-1-1v-9a1 1 0 011-1h3zm2 11h8.4a2 2 0 002-1.7l1.2-6A2 2 0 0018.6 11H13V6.5a1.5 1.5 0 00-3-1L9 10v11z"
      />
    </svg>
  );
}

function ThumbDown({ solid, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 14V3h3a1 1 0 011 1v9a1 1 0 01-1 1h-3zm-2-11H6.6a2 2 0 00-2 1.7l-1.2 6a2 2 0 002 2.3H11v4.5a1.5 1.5 0 003 1L15 14V3z"
      />
    </svg>
  );
}

function Star({ filled, half, size }) {
  const px = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span aria-hidden className={`relative inline-block leading-none ${px}`}>
      <span className="text-zinc-700">★</span>
      {(filled || half) && (
        <span
          className="absolute inset-0 overflow-hidden text-amber-400"
          style={{ width: filled ? "100%" : "50%" }}
        >
          ★
        </span>
      )}
    </span>
  );
}

export function VoteStars({ likes = 0, dislikes = 0, size = "md", showCount = true }) {
  const safeLikes = Number(likes) || 0;
  const safeDislikes = Number(dislikes) || 0;
  const total = safeLikes + safeDislikes;
  const avg = total > 0 ? (safeLikes / total) * 5 : 0;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={
        total > 0
          ? `${avg.toFixed(1)} out of 5 from ${total} vote(s) (${safeLikes} likes, ${safeDislikes} dislikes)`
          : "No votes yet"
      }
    >
      <span className="inline-flex items-center gap-0.5" aria-label={`${avg.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            filled={avg >= i - 0.25}
            half={!(avg >= i - 0.25) && avg >= i - 0.75}
          />
        ))}
      </span>
      {showCount &&
        (total > 0 ? (
          <span className="text-xs text-zinc-400">
            {avg.toFixed(1)} ({total})
          </span>
        ) : (
          <span className="text-xs text-zinc-500">No votes</span>
        ))}
    </span>
  );
}

export function VoteDisplay({ likes = 0, dislikes = 0, size = "md" }) {
  const safeLikes = Number(likes) || 0;
  const safeDislikes = Number(dislikes) || 0;
  const icon = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const text = size === "lg" ? "text-sm" : "text-xs";
  return (
    <span
      className={`inline-flex items-center gap-3 ${text} text-zinc-400`}
      title={`${safeLikes} like(s), ${safeDislikes} dislike(s)`}
    >
      <span className="inline-flex items-center gap-1">
        <ThumbUp solid={false} className={`${icon} text-zinc-500`} />
        {safeLikes}
      </span>
      <span className="inline-flex items-center gap-1">
        <ThumbDown solid={false} className={`${icon} text-zinc-500`} />
        {safeDislikes}
      </span>
    </span>
  );
}

export function VoteButtons({
  likes = 0,
  dislikes = 0,
  userVote = 0,
  onVote,
  disabled,
  size = "md",
}) {
  const safeLikes = Number(likes) || 0;
  const safeDislikes = Number(dislikes) || 0;
  const btn =
    size === "lg" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";
  const icon = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote?.(1)}
        aria-pressed={userVote === 1}
        aria-label="Like this project"
        title={userVote === 1 ? "Click again to remove your like" : "Like"}
        className={`inline-flex items-center gap-1.5 rounded border font-medium transition-colors ${btn} ${
          userVote === 1
            ? "border-green-500 bg-green-600 text-white"
            : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-green-500 hover:text-white"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <ThumbUp solid={userVote === 1} className={icon} />
        {safeLikes}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote?.(-1)}
        aria-pressed={userVote === -1}
        aria-label="Dislike this project"
        title={userVote === -1 ? "Click again to remove your dislike" : "Dislike"}
        className={`inline-flex items-center gap-1.5 rounded border font-medium transition-colors ${btn} ${
          userVote === -1
            ? "border-red-500 bg-red-600 text-white"
            : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-red-500 hover:text-white"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <ThumbDown solid={userVote === -1} className={icon} />
        {safeDislikes}
      </button>
    </span>
  );
}

export default VoteDisplay;
