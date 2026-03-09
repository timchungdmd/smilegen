// apps/desktop/src/features/viewer/DentalLighting.tsx

/** Dental studio lighting: key + fill + rim + ambient.
 *  Optimized to highlight line angles, surface texture, and translucency.
 */
export function DentalLighting() {
  return (
    <>
      {/* Ambient — prevents total black shadows */}
      <ambientLight intensity={0.35} color={0xfff8f0} />

      {/* Key light — main frontal illumination, slightly warm */}
      <directionalLight
        position={[0, 2, 3]}
        intensity={1.8}
        color={0xfff5e8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />

      {/* Fill light — soft from left, neutral */}
      <directionalLight position={[-2, 1, 1]} intensity={0.6} color={0xf0f4ff} />

      {/* Rim light — upper back, defines tooth silhouette */}
      <directionalLight position={[1, 3, -2]} intensity={0.4} color={0xffffff} />

      {/* Hemisphere light for IBL approximation when no env map */}
      <hemisphereLight args={[0xfff8f0, 0x8090a0, 0.5]} />
    </>
  );
}
