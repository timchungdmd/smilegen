// apps/desktop/src/services/meshSynthesisClient.ts
const MESH_API_URL = import.meta.env.VITE_MESH_API_URL ?? "http://localhost:8002";

export async function synthesizeCrown(
  libraryStlBlob: Blob,
  targetStlBlob: Blob,
  marginCenter: { x: number; y: number; z: number },
  marginRadius: number,
  format: "stl" | "ply" = "ply",
): Promise<Blob> {
  const form = new FormData();
  form.append("library", libraryStlBlob, "library.stl");
  form.append("target", targetStlBlob, "target.stl");
  form.append("margin_x", String(marginCenter.x));
  form.append("margin_y", String(marginCenter.y));
  form.append("margin_z", String(marginCenter.z));
  form.append("margin_radius", String(marginRadius));
  form.append("export_format", format);

  const res = await fetch(`${MESH_API_URL}/synthesis/crown`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Crown synthesis failed: ${res.status}`);
  return await res.blob();
}

export async function synthesizeVeneer(
  libraryStlBlob: Blob,
  targetStlBlob: Blob,
  shellThickness: number = 0.3,
  format: "stl" | "ply" = "ply",
): Promise<Blob> {
  const form = new FormData();
  form.append("library", libraryStlBlob, "library.stl");
  form.append("target", targetStlBlob, "target.stl");
  form.append("shell_thickness", String(shellThickness));
  form.append("export_format", format);

  const res = await fetch(`${MESH_API_URL}/synthesis/veneer`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Veneer synthesis failed: ${res.status}`);
  return await res.blob();
}
