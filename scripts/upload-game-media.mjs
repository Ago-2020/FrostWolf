// Upload a game's icon and/or banner to the "game-media" storage bucket
// and point public.games at the new public URLs.
//
// Games are curated (no public write policies), so this uses the
// service_role key, which bypasses RLS. Never expose this key to the browser.
//
//   1. Run supabase/game_media.sql once in the Supabase SQL editor.
//   2. $env:SUPABASE_URL = "https://xyz.supabase.co"
//      $env:SUPABASE_SERVICE_ROLE_KEY = "<service_role key>"   # Dashboard > Project Settings > API
//   3. node scripts/upload-game-media.mjs --slug minecraft --icon ./icon.png --banner ./banner.jpg
//
// Layout:  game-media/icons/{slug}/icon.{ext}
//          game-media/banners/{slug}/banner.{ext}
// Re-uploads replace the previous file (old extensions are cleaned up).
//
// Guidelines: icon = square PNG/WebP ~512x512 (<=1 MB),
//             banner = wide JPG/WebP ~1920x480 (<=3 MB).
import { readFile, stat } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "game-media";
const LIMITS = {
  icon: { prefixes: ["icons"], exts: ["png", "jpg", "jpeg", "webp"], maxBytes: 1024 * 1024 },
  banner: { prefixes: ["banners"], exts: ["jpg", "jpeg", "png", "webp"], maxBytes: 3 * 1024 * 1024 },
};

function usage() {
  console.log(
    "Usage: node scripts/upload-game-media.mjs --slug <game-slug> [--icon <path>] [--banner <path>]"
  );
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || !value) {
      usage();
      process.exit(1);
    }
    args[key.slice(2)] = value;
  }
  if (!args.slug || (!args.icon && !args.banner)) {
    usage();
    process.exit(1);
  }
  return args;
}

async function uploadKind(supabase, slug, kind, filePath) {
  const { exts, maxBytes } = LIMITS[kind];
  const ext = filePath.includes(".") ? filePath.split(".").pop().toLowerCase() : "";
  if (!exts.includes(ext)) {
    throw new Error(`${kind}: .${ext || "?"} not allowed (use ${exts.join(", ")})`);
  }
  const { size } = await stat(filePath);
  if (size > maxBytes) {
    throw new Error(`${kind}: ${(size / 1024 / 1024).toFixed(2)} MB exceeds ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit`);
  }
  const folder = `${kind === "icon" ? "icons" : "banners"}/${slug}`;
  const path = `${folder}/${kind}.${ext}`;
  const bytes = await readFile(filePath);

  // Remove previous files (including other extensions) so replacements are clean.
  const { data: existing } = await supabase.storage.from(BUCKET).list(folder);
  const stale = (existing ?? []).map((f) => `${folder}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from(BUCKET).remove(stale);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { upsert: true, contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const urlColumn = kind === "icon" ? "icon_url" : "banner_url";
  const pathColumn = kind === "icon" ? "icon_storage_path" : "banner_storage_path";
  const { error: updateError } = await supabase
    .from("games")
    .update({ [urlColumn]: data.publicUrl, [pathColumn]: path })
    .eq("slug", slug);
  if (updateError) throw updateError;

  console.log(`${kind} -> ${data.publicUrl}`);
}

async function main() {
  const { slug, icon, banner } = parseArgs(process.argv);
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL (or VITE_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY env vars.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (gameError) throw gameError;
  if (!game) {
    console.error(`No game with slug "${slug}".`);
    process.exit(1);
  }

  if (icon) await uploadKind(supabase, slug, "icon", icon);
  if (banner) await uploadKind(supabase, slug, "banner", banner);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
