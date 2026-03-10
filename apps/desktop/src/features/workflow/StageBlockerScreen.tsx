/**
 * StageBlockerScreen
 *
 * Displayed inside a workflow view when its preconditions are not met.
 * Explains what is missing and provides a direct action to resolve it.
 *
 * Example: navigating to Simulate before any photos are imported shows
 * this screen with "Upload a patient photo to continue" and a CTA
 * that navigates to Capture.
 */

import type { WorkflowStageId } from "./stageContracts";

interface StageBlockerScreenProps {
  /** The stage that is blocked */
  stage: WorkflowStageId | string;
  /** Human-readable explanation of what is missing */
  reason: string;
  /** Label for the primary CTA button */
  actionLabel?: string;
  /** Callback for the primary CTA button */
  onAction?: () => void;
}

export function StageBlockerScreen({
  stage: _stage,
  reason,
  actionLabel,
  onAction,
}: StageBlockerScreenProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 40,
        textAlign: "center",
      }}
    >
      {/* Lock icon */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--bg-tertiary, #252b38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #8892a0)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: 14,
          color: "var(--text-muted, #8892a0)",
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        {reason}
      </div>

      {/* Action button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: "10px 20px",
            background: "var(--accent, #00b4d8)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
