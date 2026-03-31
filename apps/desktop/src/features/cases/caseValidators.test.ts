import { describe, it, expect } from "vitest";
import { parseSmilePlan, parseAppSettings, parseCaseRecord } from "./caseValidators";

describe("parseSmilePlan", () => {
  it("accepts a valid plan", () => {
    const valid = {
      workingRange: "premolar_to_premolar",
      additiveBias: "balanced",
      symmetryMode: "soft",
      selectedTeeth: ["6", "7", "8"],
      treatmentMap: { "6": "veneer" },
      controls: {
        midline: 0,
        widthScale: 1.0,
        lengthScale: 1.0,
        incisalCurve: 0,
        proportionMode: "golden",
      },
    };
    expect(() => parseSmilePlan(valid)).not.toThrow();
  });

  it("throws on malformed plan", () => {
    expect(() => parseSmilePlan({ selectedTeeth: "not-an-array" })).toThrow();
  });
});

describe("parseAppSettings", () => {
  it("accepts valid settings", () => {
    const valid = {
      theme: "dark",
      toothNumbering: "universal",
      defaultArchDepth: 15,
      defaultArchHalfWidth: 35,
      defaultCameraDistance: 250,
      exportFormat: "stl_binary",
      autoSave: true,
      autoDetectLandmarks: true,
      expertMode: false,
    };
    expect(() => parseAppSettings(valid)).not.toThrow();
  });

  it("throws on prototype pollution attempt", () => {
    const malicious = JSON.parse(
      '{"__proto__":{"polluted":true},"theme":"dark","toothNumbering":"universal","defaultArchDepth":15,"defaultArchHalfWidth":35,"defaultCameraDistance":250,"exportFormat":"stl_binary","autoSave":true,"autoDetectLandmarks":true,"expertMode":false}'
    );
    // .strict() rejects unknown keys like __proto__
    expect(() => parseAppSettings(malicious)).toThrow();
  });
});

describe("parseCaseRecord", () => {
  it("accepts a valid case record", () => {
    const valid = {
      id: "abc-123",
      title: "Patient A",
      workflowState: "draft",
      presentationReady: false,
      exportBlocked: false,
      activeDesignVersionId: "v1",
      assets: [],
      artifacts: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(() => parseCaseRecord(valid)).not.toThrow();
  });

  it("throws on invalid workflowState", () => {
    expect(() =>
      parseCaseRecord({
        id: "x",
        title: "x",
        workflowState: "invalid_state",
        presentationReady: false,
        exportBlocked: false,
        activeDesignVersionId: "v1",
        assets: [],
        artifacts: [],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      })
    ).toThrow();
  });
});
