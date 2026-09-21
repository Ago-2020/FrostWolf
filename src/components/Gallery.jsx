import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "../lib/youtube";

// items: rows from public.project_media
// { id, kind: 'image' | 'youtube', image_url, youtube_id, caption }
function Gallery({ items = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState(0);
  const [playingId, setPlayingId] = useState(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    // Stop YouTube playback when sliding away (facade unmounts iframe).
    setPlayingId(null);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onSelect();
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi, onSelect]);

  // Reset carousel when the media list changes (e.g. project switch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(0);
    setPlayingId(null);
    emblaApi?.scrollTo(0, true);
  }, [emblaApi, items.length]);

  if (!items.length) return null;

  const current = items[selected];

  function scrollTo(index) {
    emblaApi?.scrollTo(index);
  }
  function scrollPrev() {
    emblaApi?.scrollPrev();
  }
  function scrollNext() {
    emblaApi?.scrollNext();
  }

  return (
    <section aria-label="Project gallery" className="mb-6">
      {/* Main viewport */}
      <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {items.map((item) => (
              <div key={item.id} className="min-w-0 shrink-0 grow-0 basis-full">
                <div className="aspect-video w-full bg-zinc-950">
                  {item.kind === "youtube" ? (
                    playingId === item.id ? (
                      <iframe
                        src={getYouTubeEmbedUrl(item.youtube_id, {
                          autoplay: true,
                        })}
                        title={item.caption || "YouTube video"}
                        className="h-full w-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPlayingId(item.id)}
                        className="group relative block h-full w-full"
                        aria-label={`Play video${item.caption ? `: ${item.caption}` : ""}`}
                      >
                        <img
                          src={getYouTubeThumbnail(item.youtube_id)}
                          alt={item.caption || "YouTube video thumbnail"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/20">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-105">
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-6 w-6 translate-x-0.5"
                              aria-hidden
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                      </button>
                    )
                  ) : (
                    <img
                      src={item.image_url}
                      alt={item.caption || "Gallery image"}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-white hover:bg-zinc-800"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-white hover:bg-zinc-800"
            >
              ›
            </button>
            <p className="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-0.5 text-xs text-zinc-200">
              {selected + 1} / {items.length}
            </p>
          </>
        )}
      </div>

      {current?.caption && (
        <p className="mt-2 text-sm text-zinc-400">{current.caption}</p>
      )}

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => {
            const thumb =
              item.kind === "youtube"
                ? getYouTubeThumbnail(item.youtube_id, "mqdefault")
                : item.image_url;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === selected ? "true" : undefined}
                className={`relative h-16 w-28 shrink-0 overflow-hidden rounded border ${
                  i === selected
                    ? "border-blue-500"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {item.kind === "youtube" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5 translate-x-px"
                        aria-hidden
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Gallery;
