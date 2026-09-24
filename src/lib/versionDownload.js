import { supabase } from "./supabase";

// Downloads a version file to the user's device. Handles both legacy
// external URLs (stored directly in file_path) and storage objects.
// Returns { error } — error is null on success.
export async function downloadVersionFile(version) {
  if (!version?.file_path) {
    return { error: new Error("This version has no file attached.") };
  }

  if (/^https?:\/\//.test(version.file_path)) {
    window.open(version.file_path, "_blank");
    return { error: null };
  }

  const { data, error } = await supabase.storage
    .from("project-files")
    .download(version.file_path);

  if (error) return { error };

  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = version.file_name ?? version.file_path;
  a.click();
  URL.revokeObjectURL(url);
  return { error: null };
}
