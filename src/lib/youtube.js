const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Accepts raw IDs, watch URLs, youtu.be, /embed/, /shorts/, /live/.
export function extractYouTubeId(input) {
  if (!input) return null;
  const value = String(input).trim();
  if (!value) return null;
  if (YOUTUBE_ID_RE.test(value)) return value;

  // Bare URL without protocol (e.g. youtu.be/abc...)
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url;
  try {
    url = new URL(withProto);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    // /embed/ID, /shorts/ID, /live/ID
    if (parts.length >= 2 && ["embed", "shorts", "live"].includes(parts[0])) {
      const id = parts[1];
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }
  }

  return null;
}

export function isValidYouTubeId(id) {
  return typeof id === "string" && YOUTUBE_ID_RE.test(id);
}

export function getYouTubeThumbnail(id, quality = "hqdefault") {
  if (!isValidYouTubeId(id)) return null;
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

// Privacy-enhanced embed; autoplay is appended on user click only.
export function getYouTubeEmbedUrl(id, { autoplay = false } = {}) {
  if (!isValidYouTubeId(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}`;
}
