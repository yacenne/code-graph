/**
 * Pluggable adapter interface for framework knowledge.
 * The parser contains zero framework-specific checks; framework
 * awareness is isolated entirely behind this interface.
 */

export interface FrameworkAdapter {
  /** Identifier name of the adapter */
  readonly name: string;
  /**
   * Determines whether the repository matches this framework.
   * Can inspect directory structure or configuration files.
   */
  matches(repoPath: string): boolean | Promise<boolean>;
  /**
   * Classifies a file into a framework-defined role (e.g. route, page, layout),
   * or returns undefined if the file has no special role.
   */
  classifyFile(relativePath: string): string | undefined;
  /**
   * Optional custom entry point seeds for structural traversal if needed.
   */
  getEntryPoints?(allFiles: string[]): string[];
}

/**
 * Fallback adapter assuming no framework.
 * Treats all files generically and performs no framework-specific classifications.
 */
export const fallbackAdapter: FrameworkAdapter = {
  name: 'fallback',
  matches: () => true,
  classifyFile: () => undefined,
  getEntryPoints: () => [],
};
