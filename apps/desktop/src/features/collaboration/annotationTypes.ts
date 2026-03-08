export type AnnotationType = "arrow" | "circle" | "text" | "freehand";

export interface Annotation {
  id: string;
  type: AnnotationType;
  /** Position as percentage of viewport (0-100) */
  x: number;
  y: number;
  /** For arrows: end point */
  endX?: number;
  endY?: number;
  /** For circles: radius in percentage */
  radius?: number;
  /** For text annotations */
  text?: string;
  /** For freehand: array of points */
  points?: Array<{ x: number; y: number }>;
  color: string;
  toothId?: string; // optional: pin to a specific tooth
  createdAt: string;
}
