import sampleJson from './sample-repo.json';
import excalidrawJson from './excalidraw-repo.json';
import type { ParserResult } from '@/lib/parser/types';

/**
 * Scaffolding typed dataset generated from parsing a real repository (trpc/packages).
 * Exists so the interface can be developed and verified without network, auth, or DB dependencies.
 */
export const sampleRepoData: ParserResult = sampleJson as unknown as ParserResult;
export const excalidrawRepoData: ParserResult = excalidrawJson as unknown as ParserResult;
