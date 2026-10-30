import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ParserResult, FileNode, Edge, CoverageReport } from '../lib/parser/types';

function verifyTypes(result: ParserResult): void {
  if (typeof result.repoPath !== 'string' || result.repoPath.length === 0) {
    throw new Error('Type validation failed: repoPath must be non-empty string');
  }

  if (!Array.isArray(result.files)) {
    throw new Error('Type validation failed: files must be an array');
  }

  for (const f of result.files) {
    const node = f as FileNode;
    if (typeof node.path !== 'string') throw new Error('FileNode.path must be string');
    if (typeof node.folder !== 'string') throw new Error('FileNode.folder must be string');
    if (typeof node.extension !== 'string') throw new Error('FileNode.extension must be string');
    if (typeof node.lines !== 'number') throw new Error('FileNode.lines must be number');
    if (typeof node.hash !== 'string' || node.hash.length !== 64) {
      throw new Error('FileNode.hash must be SHA-256 hex string');
    }
    if (typeof node.fanIn !== 'number') throw new Error('FileNode.fanIn must be number');
    if (typeof node.fanOut !== 'number') throw new Error('FileNode.fanOut must be number');
  }

  if (!Array.isArray(result.edges)) {
    throw new Error('Type validation failed: edges must be an array');
  }

  for (const e of result.edges) {
    const edge = e as Edge;
    if (typeof edge.source !== 'string') throw new Error('Edge.source must be string');
    if (typeof edge.target !== 'string') throw new Error('Edge.target must be string');
    if (!['import', 're-export', 'dynamic-import'].includes(edge.kind)) {
      throw new Error(`Edge.kind invalid: ${edge.kind}`);
    }
    if (typeof edge.specifier !== 'string') throw new Error('Edge.specifier must be string');
  }

  const cov = result.coverage as CoverageReport;
  if (typeof cov.filesFound !== 'number') throw new Error('coverage.filesFound must be number');
  if (typeof cov.filesParsed !== 'number') throw new Error('coverage.filesParsed must be number');
  if (typeof cov.filesSkipped !== 'number') throw new Error('coverage.filesSkipped must be number');
  if (cov.filesParsed + cov.filesSkipped !== cov.filesFound) {
    throw new Error('coverage: filesParsed + filesSkipped !== filesFound');
  }

  if (!Array.isArray(cov.skippedFiles)) throw new Error('coverage.skippedFiles must be array');
  for (const s of cov.skippedFiles) {
    if (typeof s.path !== 'string') throw new Error('SkippedFile.path must be string');
    if (typeof s.reason !== 'string' || s.reason.length === 0) {
      throw new Error('SkippedFile.reason must be non-empty string');
    }
  }

  if (typeof cov.imports.total !== 'number') throw new Error('imports.total must be number');
  if (typeof cov.reExports.found !== 'number') throw new Error('reExports.found must be number');
  if (typeof cov.reExports.resolved !== 'number') throw new Error('reExports.resolved must be number');
  if (!Array.isArray(cov.externalPackages)) throw new Error('externalPackages must be array');
  if (!Array.isArray(result.folders)) throw new Error('folders must be array');

  console.log('Verification Success: Output file read back, all ParserResult types hold strictly.');
}

const file = path.resolve(process.argv[2] || 'parse-result.json');
const raw = fs.readFileSync(file, 'utf-8');
const parsed = JSON.parse(raw) as ParserResult;
verifyTypes(parsed);
