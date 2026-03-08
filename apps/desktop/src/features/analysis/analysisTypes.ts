export interface Point2D {
  x: number;
  y: number;
}

export interface Line2D {
  start: Point2D;
  end: Point2D;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FacialLandmarks {
  pupilLeft: Point2D;
  pupilRight: Point2D;
  bipupillaryLine: Line2D;
  nasion: Point2D;
  subnasale: Point2D;
  menton: Point2D;
  upperLipCenter: Point2D;
  lowerLipCenter: Point2D;
  commissureLeft: Point2D;
  commissureRight: Point2D;
  upperLipLine: Point2D[];
  lowerLipLine: Point2D[];
  teethVisible: boolean;
  teethRegion: BoundingBox | null;
  midlineEstimate: Line2D;
  confidence: number;
  faceAngle: number;
  isSmiling: boolean;
}
