use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReferencePoint {
    photo_x: f64,
    photo_y: f64,
    scan_x: f64,
    scan_y: f64,
    scan_z: f64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReferencePoints {
    central_r: ScanReferencePoint,
    central_l: ScanReferencePoint,
    additional_points: Option<Vec<ScanReferencePoint>>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanBounds {
    width: f64,
    depth: f64,
    height: f64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoAlignedViewRequest {
    refs: ScanReferencePoints,
    scan_bounds: ScanBounds,
    canvas_aspect: f64,
    fov_deg: f64,
    photo_aspect: f64,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
pub struct Point2 {
    x: f64,
    y: f64,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PhotoAlignedViewResponse {
    position: [f64; 3],
    target: [f64; 3],
    up: [f64; 3],
    principal_point_ndc: Point2,
}

#[derive(Clone, Copy, Debug)]
struct Vec3 {
    x: f64,
    y: f64,
    z: f64,
}

#[derive(Clone, Copy, Debug)]
struct ProjectedReference {
    scan: Vec3,
    photo_ndc: Point2,
    weight: f64,
}

#[derive(Clone, Copy, Debug)]
struct PoseParams {
    yaw: f64,
    pitch: f64,
    roll: f64,
    distance: f64,
}

#[derive(Clone, Copy, Debug)]
struct PoseFitResult {
    yaw: f64,
    pitch: f64,
    roll: f64,
    distance: f64,
    principal_point_ndc: Point2,
    error: f64,
}

impl Vec3 {
    fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }

    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }

    fn scale(self, scalar: f64) -> Self {
        Self::new(self.x * scalar, self.y * scalar, self.z * scalar)
    }

    fn dot(self, other: Self) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    fn cross(self, other: Self) -> Self {
        Self::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }

    fn length(self) -> f64 {
        self.dot(self).sqrt()
    }

    fn normalized(self) -> Self {
        let len = self.length();
        if len <= 1e-9 {
            return self;
        }
        self.scale(1.0 / len)
    }

    fn to_array(self) -> [f64; 3] {
        [self.x, self.y, self.z]
    }
}

fn point_from_scan(point: ScanReferencePoint) -> Vec3 {
    Vec3::new(point.scan_x, point.scan_y, point.scan_z)
}

fn photo_percent_to_contained_ndc(
    photo_x: f64,
    photo_y: f64,
    canvas_aspect: f64,
    photo_aspect: f64,
) -> Point2 {
    let raw_ndc_x = 2.0 * photo_x - 1.0;
    let raw_ndc_y = 1.0 - 2.0 * photo_y;

    if photo_aspect > canvas_aspect {
        Point2 {
            x: raw_ndc_x,
            y: (canvas_aspect / photo_aspect) * raw_ndc_y,
        }
    } else {
        Point2 {
            x: (photo_aspect / canvas_aspect) * raw_ndc_x,
            y: raw_ndc_y,
        }
    }
}

fn build_references(
    refs: &ScanReferencePoints,
    canvas_aspect: f64,
    photo_aspect: f64,
) -> Vec<ProjectedReference> {
    let mut all_points = vec![
        (refs.central_r, 2.0),
        (refs.central_l, 2.0),
    ];

    if let Some(additional) = &refs.additional_points {
        for point in additional {
            all_points.push((*point, 1.0));
        }
    }

    all_points
        .into_iter()
        .map(|(point, weight)| ProjectedReference {
            scan: point_from_scan(point),
            photo_ndc: photo_percent_to_contained_ndc(
                point.photo_x,
                point.photo_y,
                canvas_aspect,
                photo_aspect,
            ),
            weight,
        })
        .collect()
}

fn estimate_initial_distance(
    refs: &ScanReferencePoints,
    scan_bounds: ScanBounds,
    canvas_aspect: f64,
    fov_deg: f64,
    photo_aspect: f64,
) -> f64 {
    let central_right = photo_percent_to_contained_ndc(
        refs.central_r.photo_x,
        refs.central_r.photo_y,
        canvas_aspect,
        photo_aspect,
    );
    let central_left = photo_percent_to_contained_ndc(
        refs.central_l.photo_x,
        refs.central_l.photo_y,
        canvas_aspect,
        photo_aspect,
    );

    let scan_dx = refs.central_r.scan_x - refs.central_l.scan_x;
    let scan_dy = refs.central_r.scan_y - refs.central_l.scan_y;
    let scan_frontal_distance = scan_dx.hypot(scan_dy);
    let target_dx = (central_right.x - central_left.x).abs();
    let target_dy = (central_right.y - central_left.y).abs();
    let fov_rad = fov_deg.to_radians();

    let mut distance: f64 = 0.0;
    if target_dx > 1e-3 {
        distance = distance.max(scan_dx.abs() / (target_dx * (fov_rad / 2.0).tan() * canvas_aspect));
    }
    if target_dy > 1e-3 {
        distance = distance.max(scan_dy.abs() / (target_dy * (fov_rad / 2.0).tan()));
    }
    if distance <= 0.0 && scan_frontal_distance > 1e-3 {
        let target_distance = target_dx.hypot(target_dy);
        if target_distance > 1e-3 {
            distance = scan_frontal_distance
                / (target_distance * (fov_rad / 2.0).tan() * canvas_aspect.max(photo_aspect).max(1.0));
        }
    }

    distance.max(scan_bounds.width.max(scan_bounds.depth).max(scan_bounds.height).max(1.0))
}

fn rotation_basis_yxz(pitch: f64, yaw: f64, roll: f64) -> (Vec3, Vec3, Vec3) {
    let a = pitch.cos();
    let b = pitch.sin();
    let c = yaw.cos();
    let d = yaw.sin();
    let e = roll.cos();
    let f = roll.sin();

    let ce = c * e;
    let cf = c * f;
    let de = d * e;
    let df = d * f;

    let right = Vec3::new(ce + df * b, a * f, cf * b - de).normalized();
    let up = Vec3::new(de * b - cf, a * e, df + ce * b).normalized();
    let forward = Vec3::new(-a * d, b, -a * c).normalized();

    (right, up, forward)
}

fn create_camera_pose(target: Vec3, params: PoseParams) -> (Vec3, Vec3, Vec3) {
    let (_right, up, forward) = rotation_basis_yxz(params.pitch, params.yaw, params.roll);
    let position = target.sub(forward.scale(params.distance));
    (position, up, forward)
}

fn project_point(
    point: Vec3,
    position: Vec3,
    up: Vec3,
    forward: Vec3,
    fov_deg: f64,
    canvas_aspect: f64,
) -> Option<Point2> {
    let relative = point.sub(position);
    let right = forward.cross(up).normalized();
    let true_up = right.cross(forward).normalized();
    let x_cam = relative.dot(right);
    let y_cam = relative.dot(true_up);
    let z_cam = relative.dot(forward.scale(-1.0));

    if z_cam >= -1e-6 {
        return None;
    }

    let tan_half_fov = (fov_deg.to_radians() / 2.0).tan();
    Some(Point2 {
        x: x_cam / (-z_cam * tan_half_fov * canvas_aspect),
        y: y_cam / (-z_cam * tan_half_fov),
    })
}

fn evaluate_pose(
    params: PoseParams,
    refs: &[ProjectedReference],
    target: Vec3,
    canvas_aspect: f64,
    fov_deg: f64,
) -> Option<PoseFitResult> {
    if params.distance <= 0.1 {
        return None;
    }

    let (position, _up, forward) = create_camera_pose(target, params);
    let (_right, up, _) = rotation_basis_yxz(params.pitch, params.yaw, params.roll);
    let projected: Option<Vec<Point2>> = refs
        .iter()
        .map(|reference| project_point(reference.scan, position, up, forward, fov_deg, canvas_aspect))
        .collect();

    let projected = projected?;
    let central_midpoint = Point2 {
        x: (projected[0].x + projected[1].x) / 2.0,
        y: (projected[0].y + projected[1].y) / 2.0,
    };
    let target_midpoint = Point2 {
        x: (refs[0].photo_ndc.x + refs[1].photo_ndc.x) / 2.0,
        y: (refs[0].photo_ndc.y + refs[1].photo_ndc.y) / 2.0,
    };
    let principal_point_ndc = Point2 {
        x: target_midpoint.x - central_midpoint.x,
        y: target_midpoint.y - central_midpoint.y,
    };

    let mut error = 0.0;
    for (projected, reference) in projected.iter().zip(refs.iter()) {
        let dx = projected.x + principal_point_ndc.x - reference.photo_ndc.x;
        let dy = projected.y + principal_point_ndc.y - reference.photo_ndc.y;
        error += reference.weight * (dx * dx + dy * dy);
    }

    if !error.is_finite() {
        return None;
    }

    Some(PoseFitResult {
        yaw: params.yaw,
        pitch: params.pitch,
        roll: params.roll,
        distance: params.distance,
        principal_point_ndc,
        error,
    })
}

fn fit_multi_point_pose(request: &PhotoAlignedViewRequest) -> Option<PhotoAlignedViewResponse> {
    let projected_refs = build_references(&request.refs, request.canvas_aspect, request.photo_aspect);
    if projected_refs.len() < 3 {
        return None;
    }

    let target = Vec3::new(
        (request.refs.central_r.scan_x + request.refs.central_l.scan_x) / 2.0,
        (request.refs.central_r.scan_y + request.refs.central_l.scan_y) / 2.0,
        (request.refs.central_r.scan_z + request.refs.central_l.scan_z) / 2.0,
    );

    let initial_distance = estimate_initial_distance(
        &request.refs,
        request.scan_bounds,
        request.canvas_aspect,
        request.fov_deg,
        request.photo_aspect,
    );
    let distance_seeds = [0.75, 1.0, 1.35].map(|scale| (initial_distance * scale).max(1.0));
    let angle_seeds = [-0.24, -0.12, 0.0, 0.12, 0.24];

    let mut best: Option<PoseFitResult> = None;
    for yaw in angle_seeds {
        for pitch in angle_seeds {
            for roll in angle_seeds {
                for distance in distance_seeds {
                    let candidate = evaluate_pose(
                        PoseParams {
                            yaw,
                            pitch,
                            roll,
                            distance,
                        },
                        &projected_refs,
                        target,
                        request.canvas_aspect,
                        request.fov_deg,
                    );
                    if let Some(candidate) = candidate {
                        if best.map_or(true, |current| candidate.error < current.error) {
                            best = Some(candidate);
                        }
                    }
                }
            }
        }
    }

    let mut best = best?;
    let mut step_yaw = 0.08;
    let mut step_pitch = 0.06;
    let mut step_roll = 0.06;
    let mut step_distance = (best.distance * 0.15).max(1.0);

    for _ in 0..24 {
        let mut improved = false;
        let candidates = [
            PoseParams { yaw: best.yaw + step_yaw, ..best.into() },
            PoseParams { yaw: best.yaw - step_yaw, ..best.into() },
            PoseParams { pitch: best.pitch + step_pitch, ..best.into() },
            PoseParams { pitch: best.pitch - step_pitch, ..best.into() },
            PoseParams { roll: best.roll + step_roll, ..best.into() },
            PoseParams { roll: best.roll - step_roll, ..best.into() },
            PoseParams { distance: best.distance + step_distance, ..best.into() },
            PoseParams { distance: (best.distance - step_distance).max(1.0), ..best.into() },
        ];

        for params in candidates {
            if let Some(candidate) = evaluate_pose(
                params,
                &projected_refs,
                target,
                request.canvas_aspect,
                request.fov_deg,
            ) {
                if candidate.error < best.error {
                    best = candidate;
                    improved = true;
                }
            }
        }

        if !improved {
            step_yaw *= 0.5;
            step_pitch *= 0.5;
            step_roll *= 0.5;
            step_distance *= 0.5;
            if step_yaw < 0.002 && step_pitch < 0.002 && step_roll < 0.002 && step_distance < 0.05
            {
                break;
            }
        }
    }

    let (position, up, _) = create_camera_pose(
        target,
        PoseParams {
            yaw: best.yaw,
            pitch: best.pitch,
            roll: best.roll,
            distance: best.distance,
        },
    );

    Some(PhotoAlignedViewResponse {
        position: position.to_array(),
        target: target.to_array(),
        up: up.to_array(),
        principal_point_ndc: best.principal_point_ndc,
    })
}

fn compute_central_only_view(request: &PhotoAlignedViewRequest) -> Option<PhotoAlignedViewResponse> {
    let target = Vec3::new(
        (request.refs.central_r.scan_x + request.refs.central_l.scan_x) / 2.0,
        (request.refs.central_r.scan_y + request.refs.central_l.scan_y) / 2.0,
        (request.refs.central_r.scan_z + request.refs.central_l.scan_z) / 2.0,
    );
    let photo_midpoint = photo_percent_to_contained_ndc(
        (request.refs.central_r.photo_x + request.refs.central_l.photo_x) / 2.0,
        (request.refs.central_r.photo_y + request.refs.central_l.photo_y) / 2.0,
        request.canvas_aspect,
        request.photo_aspect,
    );

    let photo_dx = request.refs.central_r.photo_x - request.refs.central_l.photo_x;
    let photo_dy = request.refs.central_r.photo_y - request.refs.central_l.photo_y;
    let photo_distance = photo_dx.hypot(photo_dy);

    let scan_dx = request.refs.central_r.scan_x - request.refs.central_l.scan_x;
    let scan_dy = request.refs.central_r.scan_y - request.refs.central_l.scan_y;
    let scan_frontal_distance = scan_dx.hypot(scan_dy);

    if scan_frontal_distance < 0.1 || photo_distance < 0.1 {
        return None;
    }

    let scale = photo_distance / scan_frontal_distance;
    let fov_rad = request.fov_deg.to_radians();
    let frustum_half_height_at_midpoint = if request.photo_aspect > request.canvas_aspect {
        50.0 / (scale * request.canvas_aspect)
    } else {
        50.0 / (scale * request.photo_aspect)
    };

    let camera_z = target.z + frustum_half_height_at_midpoint / (fov_rad / 2.0).tan();
    let min_distance = request
        .scan_bounds
        .depth
        .max(request.scan_bounds.width)
        .max(request.scan_bounds.height)
        * 0.1;

    if (camera_z - target.z).abs() < min_distance {
        return None;
    }

    Some(PhotoAlignedViewResponse {
        position: [target.x, target.y, camera_z],
        target: target.to_array(),
        up: [0.0, 1.0, 0.0],
        principal_point_ndc: photo_midpoint,
    })
}

pub fn solve_photo_aligned_view(request: &PhotoAlignedViewRequest) -> Option<PhotoAlignedViewResponse> {
    if request
        .refs
        .additional_points
        .as_ref()
        .map_or(false, |points| !points.is_empty())
    {
        if let Some(fitted) = fit_multi_point_pose(request) {
            return Some(fitted);
        }
    }

    compute_central_only_view(request)
}

#[tauri::command]
pub fn compute_photo_aligned_view(
    request: PhotoAlignedViewRequest,
) -> Option<PhotoAlignedViewResponse> {
    solve_photo_aligned_view(&request)
}

impl From<PoseFitResult> for PoseParams {
    fn from(value: PoseFitResult) -> Self {
        Self {
            yaw: value.yaw,
            pitch: value.pitch,
            roll: value.roll,
            distance: value.distance,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn project_with_view(
        point: Vec3,
        view: &PhotoAlignedViewResponse,
        width: f64,
        height: f64,
        fov_deg: f64,
    ) -> Point2 {
        let position = Vec3::new(view.position[0], view.position[1], view.position[2]);
        let target = Vec3::new(view.target[0], view.target[1], view.target[2]);
        let up = Vec3::new(view.up[0], view.up[1], view.up[2]);
        let forward = target.sub(position).normalized();
        let projected = project_point(point, position, up, forward, fov_deg, width / height).unwrap();
        Point2 {
            x: projected.x + view.principal_point_ndc.x,
            y: projected.y + view.principal_point_ndc.y,
        }
    }

    fn project_with_pose(point: Vec3, params: PoseParams, principal_point_ndc: Point2) -> (f64, f64, f64, f64) {
        let target = Vec3::new(0.0, 0.0, 0.0);
        let (position, up, forward) = create_camera_pose(target, params);
        let projected = project_point(point, position, up, forward, 45.0, 1.0).unwrap();
        let shifted = Point2 {
            x: projected.x + principal_point_ndc.x,
            y: projected.y + principal_point_ndc.y,
        };

        (
            ((shifted.x + 1.0) / 2.0) * 100.0,
            ((1.0 - shifted.y) / 2.0) * 100.0,
            shifted.x,
            shifted.y,
        )
    }

    #[test]
    fn central_points_project_to_their_marked_photo_positions() {
        let request = PhotoAlignedViewRequest {
            refs: ScanReferencePoints {
                central_r: ScanReferencePoint {
                    photo_x: 60.0,
                    photo_y: 55.0,
                    scan_x: 4.0,
                    scan_y: 0.0,
                    scan_z: 1.0,
                },
                central_l: ScanReferencePoint {
                    photo_x: 40.0,
                    photo_y: 55.0,
                    scan_x: -4.0,
                    scan_y: 0.0,
                    scan_z: 1.0,
                },
                additional_points: None,
            },
            scan_bounds: ScanBounds {
                width: 60.0,
                depth: 40.0,
                height: 20.0,
            },
            canvas_aspect: 16.0 / 9.0,
            fov_deg: 45.0,
            photo_aspect: 16.0 / 9.0,
        };

        let view = solve_photo_aligned_view(&request).unwrap();
        let right = project_with_view(Vec3::new(4.0, 0.0, 1.0), &view, 1600.0, 900.0, 45.0);
        let left = project_with_view(Vec3::new(-4.0, 0.0, 1.0), &view, 1600.0, 900.0, 45.0);

        assert!((right.x - 0.2).abs() < 1e-3);
        assert!((right.y + 0.1).abs() < 1e-3);
        assert!((left.x + 0.2).abs() < 1e-3);
        assert!((left.y + 0.1).abs() < 1e-3);
    }

    #[test]
    fn additional_landmarks_preserve_perspective_proportions() {
        let central_r = Vec3::new(4.0, 0.0, 0.0);
        let central_l = Vec3::new(-4.0, 0.0, 0.0);
        let canine_r = Vec3::new(12.0, 0.0, -4.0);
        let canine_l = Vec3::new(-12.0, 0.0, -4.0);
        let pose = PoseParams {
            yaw: 0.18,
            pitch: -0.05,
            roll: 0.03,
            distance: 30.0,
        };
        let principal = Point2 { x: 0.02, y: -0.08 };

        let (r_central_x, r_central_y, _, _) = project_with_pose(central_r, pose, principal);
        let (l_central_x, l_central_y, _, _) = project_with_pose(central_l, pose, principal);
        let (r_canine_x, r_canine_y, r_canine_ndc_x, r_canine_ndc_y) =
            project_with_pose(canine_r, pose, principal);
        let (l_canine_x, l_canine_y, l_canine_ndc_x, l_canine_ndc_y) =
            project_with_pose(canine_l, pose, principal);

        let request = PhotoAlignedViewRequest {
            refs: ScanReferencePoints {
                central_r: ScanReferencePoint {
                    photo_x: r_central_x,
                    photo_y: r_central_y,
                    scan_x: central_r.x,
                    scan_y: central_r.y,
                    scan_z: central_r.z,
                },
                central_l: ScanReferencePoint {
                    photo_x: l_central_x,
                    photo_y: l_central_y,
                    scan_x: central_l.x,
                    scan_y: central_l.y,
                    scan_z: central_l.z,
                },
                additional_points: Some(vec![
                    ScanReferencePoint {
                        photo_x: r_canine_x,
                        photo_y: r_canine_y,
                        scan_x: canine_r.x,
                        scan_y: canine_r.y,
                        scan_z: canine_r.z,
                    },
                    ScanReferencePoint {
                        photo_x: l_canine_x,
                        photo_y: l_canine_y,
                        scan_x: canine_l.x,
                        scan_y: canine_l.y,
                        scan_z: canine_l.z,
                    },
                ]),
            },
            scan_bounds: ScanBounds {
                width: 40.0,
                depth: 20.0,
                height: 20.0,
            },
            canvas_aspect: 1.0,
            fov_deg: 45.0,
            photo_aspect: 1.0,
        };

        let view = solve_photo_aligned_view(&request).unwrap();
        let right_canine = project_with_view(canine_r, &view, 1000.0, 1000.0, 45.0);
        let left_canine = project_with_view(canine_l, &view, 1000.0, 1000.0, 45.0);

        assert!((right_canine.x - r_canine_ndc_x).abs() < 0.01);
        assert!((right_canine.y - r_canine_ndc_y).abs() < 0.01);
        assert!((left_canine.x - l_canine_ndc_x).abs() < 0.01);
        assert!((left_canine.y - l_canine_ndc_y).abs() < 0.01);
    }
}
