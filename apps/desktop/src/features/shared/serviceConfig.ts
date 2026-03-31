/**
 * Service configuration constants.
 *
 * These ports must match the values used in:
 * - apps/desktop/src-tauri/src/commands.rs (VISION_HEALTH_URL, MESH_HEALTH_URL)
 * - Environment variable fallbacks in visionClient.ts and meshClient.ts
 */

export const SERVICE_PORTS = {
  /** Vision service port - face landmark detection */
  VISION: 8003,
  /** Mesh service port - 3D mesh generation */
  MESH: 8002,
} as const;

export const SERVICE_URLS = {
  /** Vision service base URL */
  VISION: `http://localhost:${SERVICE_PORTS.VISION}`,
  /** Mesh service base URL */
  MESH: `http://localhost:${SERVICE_PORTS.MESH}`,
} as const;
