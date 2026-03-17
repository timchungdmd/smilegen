import {
  getCaseWorkflowStage,
  normalizeViewId,
  type CaseWorkflowStage,
  type ViewId,
} from "../../store/useViewportStore";
import type { WorkspaceVariant } from "./workspaceVariantStore";

type AlignmentAttemptSurface = "import" | "design";

interface WorkspaceMetricsSnapshot {
  sessionStartedAt: number | null;
  sessionEndedAt: number | null;
  requestedVariant: WorkspaceVariant | null;
  activeVariant: WorkspaceVariant | null;
  lastTrackedView: ViewId | null;
  lastTrackedRoute: ViewId | null;
  currentStage: CaseWorkflowStage | null;
  currentStageStartedAt: number | null;
  totalElapsedMs: number;
  modeSwitchCount: number;
  alignmentAttemptCount: number;
  alignmentRetryCount: number;
  alignmentAttemptsBySurface: Record<AlignmentAttemptSurface, number>;
  stageEntryCount: Partial<Record<CaseWorkflowStage, number>>;
  stageFirstEnteredAt: Partial<Record<CaseWorkflowStage, number>>;
  stageDurationsMs: Partial<Record<CaseWorkflowStage, number>>;
  firstSimulationReadyAt: number | null;
  reviewApprovalCount: number;
  reviewApprovedAt: number | null;
  progressionToPresentCount: number;
  presentedAt: number | null;
}

const STORAGE_KEY = "smilegen-workspace-metrics";

function createInitialWorkspaceMetrics(): WorkspaceMetricsSnapshot {
  return {
    sessionStartedAt: null,
    sessionEndedAt: null,
    requestedVariant: null,
    activeVariant: null,
    lastTrackedView: null,
    lastTrackedRoute: null,
    currentStage: null,
    currentStageStartedAt: null,
    totalElapsedMs: 0,
    modeSwitchCount: 0,
    alignmentAttemptCount: 0,
    alignmentRetryCount: 0,
    alignmentAttemptsBySurface: {
      import: 0,
      design: 0,
    },
    stageEntryCount: {},
    stageFirstEnteredAt: {},
    stageDurationsMs: {},
    firstSimulationReadyAt: null,
    reviewApprovalCount: 0,
    reviewApprovedAt: null,
    progressionToPresentCount: 0,
    presentedAt: null,
  };
}

function cloneMetrics(metrics: WorkspaceMetricsSnapshot): WorkspaceMetricsSnapshot {
  return {
    ...metrics,
    alignmentAttemptsBySurface: { ...metrics.alignmentAttemptsBySurface },
    stageEntryCount: { ...metrics.stageEntryCount },
    stageFirstEnteredAt: { ...metrics.stageFirstEnteredAt },
    stageDurationsMs: { ...metrics.stageDurationsMs },
  };
}

function getNow(now?: number) {
  return now ?? Date.now();
}

function readStoredMetrics(): WorkspaceMetricsSnapshot | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return {
      ...createInitialWorkspaceMetrics(),
      ...JSON.parse(raw),
    } as WorkspaceMetricsSnapshot;
  } catch {
    return null;
  }
}

let workspaceMetrics = readStoredMetrics() ?? createInitialWorkspaceMetrics();

function persistWorkspaceMetrics() {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceMetrics));
  } catch {
    // Local-first instrumentation should never break the UI if storage is unavailable.
  }
}

function accumulateStageDuration(now: number) {
  if (!workspaceMetrics.currentStage || workspaceMetrics.currentStageStartedAt === null) {
    return;
  }

  const elapsed = Math.max(0, now - workspaceMetrics.currentStageStartedAt);
  workspaceMetrics.stageDurationsMs[workspaceMetrics.currentStage] =
    (workspaceMetrics.stageDurationsMs[workspaceMetrics.currentStage] ?? 0) + elapsed;
}

export function resetWorkspaceMetrics() {
  workspaceMetrics = createInitialWorkspaceMetrics();

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures in tests or private contexts.
    }
  }
}

export function getWorkspaceMetricsSnapshot(): WorkspaceMetricsSnapshot {
  return cloneMetrics(workspaceMetrics);
}

export function startWorkspaceSession(variant: WorkspaceVariant, now?: number) {
  const timestamp = getNow(now);

  workspaceMetrics.requestedVariant = variant;
  workspaceMetrics.activeVariant = variant;

  if (workspaceMetrics.sessionStartedAt === null) {
    workspaceMetrics.sessionStartedAt = timestamp;
    workspaceMetrics.sessionEndedAt = null;
    workspaceMetrics.totalElapsedMs = 0;
  }

  persistWorkspaceMetrics();
}

export function syncWorkspaceVariant(variant: WorkspaceVariant, now?: number) {
  startWorkspaceSession(variant, now);
  workspaceMetrics.activeVariant = variant;
  persistWorkspaceMetrics();
}

export function trackWorkspaceView(view: ViewId, now?: number) {
  const timestamp = getNow(now);
  const route = normalizeViewId(view);
  const stage = getCaseWorkflowStage(view);
  const isRouteChange =
    workspaceMetrics.lastTrackedRoute !== null && workspaceMetrics.lastTrackedRoute !== route;

  if (isRouteChange) {
    workspaceMetrics.modeSwitchCount += 1;
  }

  if (stage && workspaceMetrics.currentStage !== stage) {
    accumulateStageDuration(timestamp);
    workspaceMetrics.currentStage = stage;
    workspaceMetrics.currentStageStartedAt = timestamp;
    workspaceMetrics.stageEntryCount[stage] =
      (workspaceMetrics.stageEntryCount[stage] ?? 0) + 1;
    if (workspaceMetrics.stageFirstEnteredAt[stage] === undefined) {
      workspaceMetrics.stageFirstEnteredAt[stage] = timestamp;
    }
  } else if (stage && workspaceMetrics.currentStageStartedAt === null) {
    workspaceMetrics.currentStageStartedAt = timestamp;
  }

  workspaceMetrics.lastTrackedView = view;
  workspaceMetrics.lastTrackedRoute = route;

  persistWorkspaceMetrics();
}

export function recordAlignmentAttempt(surface: AlignmentAttemptSurface, now?: number) {
  const timestamp = getNow(now);
  if (workspaceMetrics.sessionStartedAt === null) {
    workspaceMetrics.sessionStartedAt = timestamp;
  }

  workspaceMetrics.alignmentAttemptCount += 1;
  workspaceMetrics.alignmentRetryCount = Math.max(
    0,
    workspaceMetrics.alignmentAttemptCount - 1,
  );
  workspaceMetrics.alignmentAttemptsBySurface[surface] += 1;

  persistWorkspaceMetrics();
}

export function recordFirstSimulationReady(now?: number) {
  const timestamp = getNow(now);
  if (workspaceMetrics.firstSimulationReadyAt === null) {
    workspaceMetrics.firstSimulationReadyAt = timestamp;
    persistWorkspaceMetrics();
  }
}

export function recordReviewApproval(now?: number) {
  const timestamp = getNow(now);
  if (workspaceMetrics.reviewApprovedAt !== null) {
    return;
  }

  workspaceMetrics.reviewApprovalCount += 1;
  workspaceMetrics.reviewApprovedAt = timestamp;

  persistWorkspaceMetrics();
}

export function recordPresentationViewed(now?: number) {
  const timestamp = getNow(now);
  if (workspaceMetrics.presentedAt !== null) {
    return;
  }

  workspaceMetrics.progressionToPresentCount += 1;
  workspaceMetrics.presentedAt = timestamp;

  persistWorkspaceMetrics();
}

export function finishWorkspaceSession(now?: number) {
  const timestamp = getNow(now);

  if (workspaceMetrics.sessionStartedAt === null) {
    return;
  }

  if (workspaceMetrics.sessionEndedAt !== null && workspaceMetrics.sessionEndedAt >= timestamp) {
    return;
  }

  accumulateStageDuration(timestamp);
  workspaceMetrics.currentStageStartedAt = timestamp;
  workspaceMetrics.sessionEndedAt = timestamp;
  workspaceMetrics.totalElapsedMs = Math.max(
    0,
    timestamp - workspaceMetrics.sessionStartedAt,
  );

  persistWorkspaceMetrics();
}
