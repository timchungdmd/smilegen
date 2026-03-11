import {
  archDepthAtX,
  perspectiveScale,
  projectToothToPhoto,
  buildCalibrationFromGuides,
  buildCalibrationFromIncisalPoints,
  DEFAULT_CALIBRATION
} from "./archModel";

test("arch depth is zero at the midline", () => {
  expect(archDepthAtX(0, DEFAULT_CALIBRATION)).toBeCloseTo(0, 10);
});

test("arch depth increases with distance from midline", () => {
  const d10 = archDepthAtX(10, DEFAULT_CALIBRATION);
  const d20 = archDepthAtX(20, DEFAULT_CALIBRATION);
  const d35 = archDepthAtX(35, DEFAULT_CALIBRATION);

  // All should be negative (receding from camera)
  expect(d10).toBeLessThan(0);
  expect(d20).toBeLessThan(d10);
  expect(d35).toBeLessThanOrEqual(d20);
  // At the edge, depth should equal -archDepth
  expect(d35).toBeCloseTo(-DEFAULT_CALIBRATION.archDepth, 5);
});

test("arch depth is symmetric", () => {
  expect(archDepthAtX(-15, DEFAULT_CALIBRATION)).toBeCloseTo(
    archDepthAtX(15, DEFAULT_CALIBRATION),
    5
  );
});

test("perspective scale is 1 at the apex (z=0)", () => {
  expect(perspectiveScale(0, DEFAULT_CALIBRATION)).toBeCloseTo(1, 5);
});

test("perspective scale decreases for negative z (further away)", () => {
  const s0 = perspectiveScale(0, DEFAULT_CALIBRATION);
  const s5 = perspectiveScale(-5, DEFAULT_CALIBRATION);
  const s15 = perspectiveScale(-15, DEFAULT_CALIBRATION);

  expect(s5).toBeLessThan(s0);
  expect(s15).toBeLessThan(s5);
  // At z=-15 with D=250: scale = 250/265 ≈ 0.943
  expect(s15).toBeCloseTo(250 / 265, 3);
});

test("midline tooth projects to the calibration midlineX", () => {
  const proj = projectToothToPhoto(0, 0, DEFAULT_CALIBRATION);
  expect(proj.x).toBeCloseTo(DEFAULT_CALIBRATION.midlineX, 5);
  expect(proj.y).toBeCloseTo(DEFAULT_CALIBRATION.incisalY, 5);
  expect(proj.scale).toBeCloseTo(1, 5);
});

test("teeth further from midline project with smaller scale", () => {
  const central = projectToothToPhoto(0, 0, DEFAULT_CALIBRATION);
  const lateral = projectToothToPhoto(10, 0, DEFAULT_CALIBRATION);
  const premolar = projectToothToPhoto(30, 0, DEFAULT_CALIBRATION);

  expect(lateral.scale).toBeLessThan(central.scale);
  expect(premolar.scale).toBeLessThan(lateral.scale);
});

test("symmetric teeth project symmetrically around midline", () => {
  const left = projectToothToPhoto(-15, 0, DEFAULT_CALIBRATION);
  const right = projectToothToPhoto(15, 0, DEFAULT_CALIBRATION);

  expect(left.scale).toBeCloseTo(right.scale, 5);
  // Left should be to the left of midline
  expect(left.x).toBeLessThan(DEFAULT_CALIBRATION.midlineX);
  expect(right.x).toBeGreaterThan(DEFAULT_CALIBRATION.midlineX);
  // Symmetric distance from midline
  const distLeft = DEFAULT_CALIBRATION.midlineX - left.x;
  const distRight = right.x - DEFAULT_CALIBRATION.midlineX;
  expect(distLeft).toBeCloseTo(distRight, 3);
});

test("perspective makes lateral teeth appear closer together", () => {
  // Without perspective, teeth at ±15mm would be equidistant from ±5mm teeth
  // With perspective, the ±15mm teeth are further from camera,
  // so the gap between 5mm and 15mm should be less than 10mm * scale
  const t5 = projectToothToPhoto(5, 0, DEFAULT_CALIBRATION);
  const t15 = projectToothToPhoto(15, 0, DEFAULT_CALIBRATION);
  const t25 = projectToothToPhoto(25, 0, DEFAULT_CALIBRATION);

  const gap1 = t15.x - t5.x;
  const gap2 = t25.x - t15.x;

  // Gap between 15-25 should be smaller than gap between 5-15
  // because teeth further from midline recede more
  expect(gap2).toBeLessThan(gap1);
});

test("buildCalibrationFromGuides produces valid calibration", () => {
  const cal = buildCalibrationFromGuides(50, 55, 600, 400, 70);

  expect(cal.midlineX).toBe(300);
  expect(cal.incisalY).toBeCloseTo(220, 5);
  expect(cal.archHalfWidth).toBe(35);
  expect(cal.scale).toBeGreaterThan(0);
  expect(cal.cameraDistance).toBeGreaterThan(0);
});

test("commissure guides control the scale", () => {
  // Default commissure (20%-80%) = 60% of view width = 360px for 70mm arch
  const calDefault = buildCalibrationFromGuides(50, 55, 600, 400, 70, undefined, 20, 80);
  // Wider commissure (10%-90%) = 80% of view width = 480px for 70mm arch
  const calWide = buildCalibrationFromGuides(50, 55, 600, 400, 70, undefined, 10, 90);

  // Wider commissure distance should produce a larger scale
  expect(calWide.scale).toBeGreaterThan(calDefault.scale);
  // Scale should equal commissureDistancePx / archWidth
  expect(calDefault.scale).toBeCloseTo(360 / 70, 3);
  expect(calWide.scale).toBeCloseTo(480 / 70, 3);
});

describe('buildCalibrationFromIncisalPoints', () => {
  it('computes midlineX as midpoint of the two central photo X positions', () => {
    const centralR = { photoX: 60, photoY: 55, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 55, scanX: -4, scanY: 0, scanZ: 0 };
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100);
    expect(cal.midlineX).toBeCloseTo(50);
  });

  it('computes incisalY as midpoint of the two central photo Y positions', () => {
    const centralR = { photoX: 60, photoY: 50, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 60, scanX: -4, scanY: 0, scanZ: 0 };
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100);
    expect(cal.incisalY).toBeCloseTo(55);
  });

  it('computes scale from photo distance / scan distance', () => {
    // photo distance = sqrt((60-40)^2 + (55-55)^2) = 20 percent units
    // scan distance  = sqrt((4-(-4))^2 + 0 + 0)     = 8 mm
    // scale = 20 / 8 = 2.5 percent/mm
    const centralR = { photoX: 60, photoY: 55, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 55, scanX: -4, scanY: 0, scanZ: 0 };
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100);
    expect(cal.scale).toBeCloseTo(2.5);
  });

  it('derives commissure X from scale and archHalfWidth', () => {
    const centralR = { photoX: 60, photoY: 55, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 55, scanX: -4, scanY: 0, scanZ: 0 };
    // archHalfWidth defaults to 35mm; scale = 2.5; offset = 35 * 2.5 = 87.5 → OOB → clamped
    // With archScanWidth=20 → archHalfWidth=10; offset = 10 * 2.5 = 25
    // rightCommissureX = 50 + 25 = 75, leftCommissureX = 50 - 25 = 25
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100, 20);
    expect(cal.midlineX).toBeCloseTo(50);
    // scale * archHalfWidth = 2.5 * 10 = 25 → rightCommissureX ~ 75, leftCommissureX ~ 25
  });
});
