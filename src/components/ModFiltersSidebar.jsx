import { useState } from "react";

function DropdownSection({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded px-1 py-1 text-left hover:bg-zinc-800/60"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {title}
          {badge > 0 && (
            <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-zinc-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div className="mt-1.5 flex flex-col gap-1.5">{children}</div>}
    </section>
  );
}

function CheckRow({ checked, label, count, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-blue-600"
      />
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" && (
        <span className="text-xs text-zinc-500">{count}</span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white [color-scheme:dark]";

function ModFiltersSidebar({
  search,
  onSearchChange,
  tags,
  selectedTags,
  onToggleTag,
  gameVersions,
  selectedGameVersions,
  onToggleGameVersion,
  loaders,
  selectedLoaders,
  onToggleLoader,
  channels,
  selectedChannels,
  onToggleChannel,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  activeFilterCount,
  onClear,
}) {
  const dateBadge = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-4 rounded border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Filters{" "}
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </h2>
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-zinc-400 hover:text-white hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Search
        </p>
        <input
          type="text"
          placeholder="Search mods (e.g. sodium)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
      </div>

      <DropdownSection title="Tags" badge={selectedTags.length} defaultOpen>
        {tags.length === 0 ? (
          <p className="px-1 text-xs text-zinc-500">
            No tags for this game yet.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto pr-1">
            {tags.map((tag) => (
              <CheckRow
                key={tag.id}
                label={tag.name}
                count={tag.count}
                checked={selectedTags.includes(tag.id)}
                onChange={() => onToggleTag(tag.id)}
              />
            ))}
          </div>
        )}
      </DropdownSection>

      <DropdownSection
        title="Game versions"
        badge={selectedGameVersions.length}
      >
        {gameVersions.length === 0 ? (
          <p className="px-1 text-xs text-zinc-500">
            No game versions listed.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto pr-1">
            {gameVersions.map((v) => (
              <CheckRow
                key={v.id}
                label={v.version}
                checked={selectedGameVersions.includes(v.id)}
                onChange={() => onToggleGameVersion(v.id)}
              />
            ))}
          </div>
        )}
      </DropdownSection>

      <DropdownSection title="Loaders" badge={selectedLoaders.length}>
        {loaders.length === 0 ? (
          <p className="px-1 text-xs text-zinc-500">No loaders listed.</p>
        ) : (
          loaders.map((l) => (
            <CheckRow
              key={l.id}
              label={l.name}
              checked={selectedLoaders.includes(l.id)}
              onChange={() => onToggleLoader(l.id)}
            />
          ))
        )}
      </DropdownSection>

      <DropdownSection
        title="Release channel"
        badge={selectedChannels.length}
      >
        {channels.map((c) => (
          <CheckRow
            key={c}
            label={c}
            checked={selectedChannels.includes(c)}
            onChange={() => onToggleChannel(c)}
          />
        ))}
      </DropdownSection>

      <DropdownSection title="Updated" badge={dateBadge}>
        <label className="px-1 text-xs text-zinc-400">
          From
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="px-1 text-xs text-zinc-400">
          To
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => onDateToChange(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </DropdownSection>
    </div>
  );
}

export function ModFiltersSidebarSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse flex-col gap-4 rounded border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="h-4 w-20 rounded bg-zinc-700" />
      <div className="h-9 rounded bg-zinc-800" />
      {[160, 128, 96, 80, 72].map((h) => (
        <div key={h} className="rounded bg-zinc-800" style={{ height: h }} />
      ))}
    </div>
  );
}

export default ModFiltersSidebar;
