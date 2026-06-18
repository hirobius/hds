/**
 * tokenAuditReportTypes — shared TypeScript types for token-audit-report.json.
 * Created 2026-05-01 (12i-bloat-token-audit-types-shared) to unify the
 * previously-divergent inline type definitions in HDSLayout.tsx and
 * LegacyTokenDetail.tsx.
 *
 * Fields that diverged between the two consumers are made optional here;
 * the JSON data has them present at runtime.
 */

export type UsageEntry = {
  tokenPath: string;
  totalReferences: number;
  files: string[];
  fileReferences: Array<{ file: string; references: number }>;
};

export type HealthHistoryEntry = {
  recordedAt: string;
  generatedAt: string;
  score: number;
  grade: string;
  totalViolations: number;
  counts: {
    ghostComponentVars: number;
    themeForbiddenOverrides: number;
    inlineStyleViolations: number;
    semanticMappingViolations: number;
    forbiddenOverrides: number;
  };
};

export type TokenAuditReport = {
  generatedAt?: string;
  semanticMappingViolations?: Array<{
    file: string;
    line: number;
    selector?: string;
    prop?: string;
    value?: string;
    reason?: string;
    expected?: string;
  }>;
  counts?: {
    ghostComponentVars: number;
    themeForbiddenOverrides: number;
    inlineStyleViolations: number;
    semanticMappingViolations: number;
    forbiddenOverrides: number;
    semanticHits: number;
    primitiveHits: number;
    systemIntegrityGrade: string;
    semanticDeadWood?: number;
    semanticHighBlastRadius?: number;
    semanticMaxBlastRadius?: number;
  };
  integrity?: {
    score: number;
    grade: string;
  };
  usageSummary?: {
    totalTokens?: number;
    totalReferences?: number;
    deadWood?: number;
    highBlastRadius: number;
    maxBlastRadius?: number;
    maxBlastRadiusToken?: string | null;
  };
  usageMap?: Record<string, UsageEntry>;
};
