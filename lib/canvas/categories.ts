import type { FileNode } from '@/lib/parser/types';

export interface FileCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

/**
 * Classifies a relative file path into a high-level architectural category.
 * Pure function with zero side effects.
 */
export function classifyFileCategory(filePath: string): string {
  const lower = filePath.toLowerCase();

  // Test files and test suites
  if (
    lower.includes('test') ||
    lower.includes('spec') ||
    lower.includes('__tests__') ||
    lower.includes('/tests/')
  ) {
    return 'tests';
  }

  // UI components and view layer
  if (
    lower.endsWith('.tsx') ||
    lower.endsWith('.jsx') ||
    lower.includes('/components/') ||
    lower.includes('/react/')
  ) {
    return 'components';
  }

  // Type definitions and contracts
  if (
    lower.endsWith('.d.ts') ||
    lower.endsWith('/types.ts') ||
    lower.endsWith('/types.d.ts') ||
    lower.includes('/types/')
  ) {
    return 'types';
  }

  // Adapters, servers, transports, and integration links
  if (
    lower.includes('adapter') ||
    lower.includes('/links/') ||
    lower.includes('/server/') ||
    lower.includes('/http/') ||
    lower.includes('/ws/') ||
    lower.includes('server')
  ) {
    return 'adapters';
  }

  // Core internal logic, utils, and base modules
  return 'core';
}

/**
 * Visual design system category tokens.
 * Colors chosen to avoid collision with incoming (green) and outgoing (amber) edge colors.
 */
export const CATEGORY_TOKENS: Record<string, { name: string; color: string }> = {
  components: {
    name: 'Components',
    color: '#0ea5e9', // Sky blue
  },
  adapters: {
    name: 'Adapters & Server',
    color: '#8b5cf6', // Violet
  },
  core: {
    name: 'Core Logic',
    color: '#3b82f6', // Indigo / Blue
  },
  types: {
    name: 'Types & Contracts',
    color: '#14b8a6', // Teal
  },
  tests: {
    name: 'Tests & Specs',
    color: '#64748b', // Slate
  },
};

/**
 * Derives the list of file categories with counts from a FileNode list.
 * Pure calculation over the parser output.
 */
export function deriveCategories(files: FileNode[]): FileCategory[] {
  const counts: Record<string, number> = {};

  for (const file of files) {
    const categoryId = classifyFileCategory(file.path);
    counts[categoryId] = (counts[categoryId] || 0) + 1;
  }

  const standardOrder = ['components', 'adapters', 'core', 'types', 'tests'];

  const results: FileCategory[] = [];

  for (const id of standardOrder) {
    const count = counts[id] || 0;
    if (count > 0) {
      results.push({
        id,
        name: CATEGORY_TOKENS[id]?.name ?? id,
        color: CATEGORY_TOKENS[id]?.color ?? '#71717a',
        count,
      });
    }
  }

  // Append any extra category if encountered
  for (const [id, count] of Object.entries(counts)) {
    if (!standardOrder.includes(id) && count > 0) {
      results.push({
        id,
        name: id,
        color: '#71717a',
        count,
      });
    }
  }

  return results;
}
