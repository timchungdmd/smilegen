import {
  finishWorkspaceSession,
  getWorkspaceMetricsSnapshot,
  recordAlignmentAttempt,
  recordFirstSimulationReady,
  recordPresentationViewed,
  recordReviewApproval,
  resetWorkspaceMetrics,
  startWorkspaceSession,
  trackWorkspaceView,
} from "./workspaceMetrics";

beforeEach(() => {
  resetWorkspaceMetrics();
});

test("captures session timing across stage changes", () => {
  startWorkspaceSession("workspace", 100);

  trackWorkspaceView("import", 100);
  trackWorkspaceView("design", 250);
  finishWorkspaceSession(400);

  const snapshot = getWorkspaceMetricsSnapshot();

  expect(snapshot.sessionStartedAt).toBe(100);
  expect(snapshot.sessionEndedAt).toBe(400);
  expect(snapshot.totalElapsedMs).toBe(300);
  expect(snapshot.stageDurationsMs.import).toBe(150);
  expect(snapshot.stageDurationsMs.design).toBe(150);
});

test("counts mode switches only when the active route changes", () => {
  startWorkspaceSession("guided", 0);

  // Note: "align" is now mapped to "import" in the workflow, so it doesn't count as a separate mode
  trackWorkspaceView("import", 0);
  trackWorkspaceView("design", 50);
  trackWorkspaceView("design", 100);
  trackWorkspaceView("review", 125);

  const snapshot = getWorkspaceMetricsSnapshot();

  expect(snapshot.modeSwitchCount).toBe(2);
  expect(snapshot.stageEntryCount.import).toBe(1);
  expect(snapshot.stageEntryCount.design).toBe(1);
  expect(snapshot.stageEntryCount.review).toBe(1);
});

test("tracks alignment retries after the first calibration attempt", () => {
  startWorkspaceSession("workspace", 0);

  recordAlignmentAttempt("import", 10);
  recordAlignmentAttempt("design", 20);
  recordAlignmentAttempt("import", 30);

  const snapshot = getWorkspaceMetricsSnapshot();

  expect(snapshot.alignmentAttemptCount).toBe(3);
  expect(snapshot.alignmentRetryCount).toBe(2);
  expect(snapshot.alignmentAttemptsBySurface.import).toBe(2);
  expect(snapshot.alignmentAttemptsBySurface.design).toBe(1);
});

test("records first simulation, review approval, and first presentation progression", () => {
  startWorkspaceSession("guided", 0);

  recordFirstSimulationReady(120);
  recordFirstSimulationReady(180);
  recordReviewApproval(200);
  recordPresentationViewed(260);
  recordPresentationViewed(300);

  const snapshot = getWorkspaceMetricsSnapshot();

  expect(snapshot.firstSimulationReadyAt).toBe(120);
  expect(snapshot.reviewApprovalCount).toBe(1);
  expect(snapshot.progressionToPresentCount).toBe(1);
  expect(snapshot.presentedAt).toBe(260);
});
