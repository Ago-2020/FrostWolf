export function getGameVersionOptions(versions) {
  const map = new Map();
  for (const v of versions ?? []) {
    for (const x of v.project_version_game_versions ?? []) {
      const gv = x.game_versions;
      if (gv && !map.has(gv.id)) map.set(gv.id, gv);
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.released_at && b.released_at) {
      return new Date(b.released_at) - new Date(a.released_at);
    }
    return String(a.version).localeCompare(String(b.version), undefined, {
      numeric: true,
    });
  });
}

export function getLoaderOptions(versions) {
  const map = new Map();
  for (const v of versions ?? []) {
    for (const x of v.project_version_loaders ?? []) {
      const l = x.loaders;
      if (l && !map.has(l.id)) map.set(l.id, l);
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
}

export function filterVersions(versions, { gameVersionId, loaderId }) {
  return (versions ?? []).filter((v) => {
    if (gameVersionId) {
      const ids = (v.project_version_game_versions ?? []).map(
        (x) => x.game_versions?.id
      );
      if (!ids.includes(gameVersionId)) return false;
    }
    if (loaderId) {
      const ids = (v.project_version_loaders ?? []).map(
        (x) => x.loaders?.id
      );
      if (!ids.includes(loaderId)) return false;
    }
    return true;
  });
}
