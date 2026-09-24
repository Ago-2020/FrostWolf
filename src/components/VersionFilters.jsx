import {
  getGameVersionOptions,
  getLoaderOptions,
} from "../lib/versionFilters";

function VersionFilters({
  versions,
  gameVersionId,
  loaderId,
  onGameVersionChange,
  onLoaderChange,
  showLoader = true,
}) {
  const gameVersions = getGameVersionOptions(versions);
  const loaders = getLoaderOptions(versions);

  const selectClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50";

  return (
    <div
      className={
        showLoader ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "w-full"
      }
    >
      <select
        value={gameVersionId}
        onChange={(e) => onGameVersionChange(e.target.value)}
        aria-label="Filter by game version"
        className={selectClass}
      >
        <option value="">Select game version</option>
        {gameVersions.map((gv) => (
          <option key={gv.id} value={gv.id}>
            {gv.version}
          </option>
        ))}
      </select>
      {showLoader && (
        <select
          value={loaderId}
          onChange={(e) => onLoaderChange(e.target.value)}
          aria-label="Filter by loader"
          className={selectClass}
        >
          <option value="">Select loader</option>
          {loaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default VersionFilters;
