import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const KEBAB = "\u22EE";

function VersionMenu({ open, onToggle, onClose, onDownload, onDelete, downloading }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  // Pin the menu to the button's viewport position. Rendered in a portal
  // so scroll containers (e.g. the versions table) can't clip it.
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    function place() {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    place();
  }, [open ]);

  // Close on outside click, Escape, scroll, or resize.
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose]);

  const itemClass =
    "block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="Version options"
        aria-expanded={open}
        className="rounded px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-800 hover:text-white"
      >
        {KEBAB}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, right: coords.right }}
            className="fixed z-50 mt-0 w-44 overflow-hidden rounded border border-zinc-700 bg-zinc-950 shadow-xl"
          >
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className={itemClass}
            >
              {downloading ? "Downloading..." : "Download file"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={`${itemClass} text-red-400 hover:bg-red-950`}
            >
              Delete version
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export default VersionMenu;
