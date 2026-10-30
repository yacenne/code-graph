/**
 * Contract types for the Cartograph codebase parser.
 * Everything built downstream reads this output shape.
 */

export type EdgeKind = 'import' | 're-export' | 'dynamic-import';

export interface FileNode {
  /** Relative POSIX path from repository root (e.g. "lib/auth/org.ts") */
  path: string;
  /** Granular containing folder relative to repo root (e.g. "lib/auth" or "." for root) */
  folder: string;
  /** File extension including the dot (e.g. ".ts", ".tsx") */
  extension: string;
  /** Total number of lines in the file */
  lines: number;
  /** SHA-256 hash of file contents */
  hash: string;
  /** Number of distinct internal files that import this file */
  fanIn: number;
  /** Number of distinct internal files that this file imports */
  fanOut: number;
}

export interface Edge {
  /** Relative POSIX path of source file */
  source: string;
  /** Relative POSIX path of target file (inside repository) */
  target: string;
  /** Kind of relationship: plain import, re-export, or dynamic import */
  kind: EdgeKind;
  /** Raw import specifier as written in the source code */
  specifier: string;
}

export type ImportResolutionStatus = 'internal' | 'external' | 'excluded' | 'unresolved';

export interface SkippedFile {
  /** Relative POSIX path of skipped file */
  path: string;
  /** Explicit reason why the file was skipped */
  reason: string;
}

export interface UnresolvedImport {
  /** Relative POSIX path of file containing the import */
  sourceFile: string;
  /** Raw specifier that failed to resolve */
  specifier: string;
  /** Kind of import statement */
  kind: EdgeKind;
  /** Explicit reason explaining why resolution failed */
  reason: string;
  /** 1-indexed line number in source file if available */
  line?: number;
}

export interface ReExportRecord {
  sourceFile: string;
  specifier: string;
  resolved: boolean;
  target?: string;
  reason?: string;
  line?: number;
}

export interface ImportCoverage {
  total: number;
  internal: number;
  external: number;
  excluded: number;
  unresolved: number;
}

export interface ReExportCoverage {
  found: number;
  resolved: number;
  unresolved: number;
  gaps: Array<{
    sourceFile: string;
    specifier: string;
    reason: string;
    line?: number;
  }>;
}

export interface CoverageReport {
  /** Total files encountered during repository walk */
  filesFound: number;
  /** Total code modules parsed into nodes */
  filesParsed: number;
  /** Total files skipped with an explicit reason */
  filesSkipped: number;
  /** Detailed list of skipped files and reasons */
  skippedFiles: SkippedFile[];
  /** Breakdown of skip reasons to count */
  skipReasonsSummary: Record<string, number>;
  /** Overall import resolution metrics */
  imports: ImportCoverage;
  /** Re-export tracking metrics */
  reExports: ReExportCoverage;
  /** Full list of failed imports with explicit reasons */
  unresolvedImports: UnresolvedImport[];
  /** List of distinct external package names encountered */
  externalPackages: string[];
}

export interface ParserResult {
  /** Absolute path of repository analyzed */
  repoPath: string;
  /** Parsed file nodes with line counts, hashes, and fan-in/fan-out */
  files: FileNode[];
  /** Deduplicated directed edges between internal files */
  edges: Edge[];
  /** Comprehensive coverage report */
  coverage: CoverageReport;
  /** Sorted list of distinct folders */
  folders: string[];
}

export interface ParserOptions {
  /** Custom adapter if any; defaults to fallbackAdapter */
  adapter?: import('./adapter').FrameworkAdapter;
}
