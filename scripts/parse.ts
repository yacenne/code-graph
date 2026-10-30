#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseRepository } from '../lib/parser';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: pnpm parse <repo-path> [--output <output-file.json>]

Options:
  -o, --output <file>    Write complete typed ParserResult to a JSON file
  -h, --help             Show this help message
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  let repoPath = '';
  let outputFile = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      outputFile = args[i + 1];
      i++;
    } else if (!repoPath) {
      repoPath = args[i];
    }
  }

  if (!repoPath) {
    console.error('Error: Repository path required.');
    process.exit(1);
  }

  const absoluteRepoPath = path.resolve(repoPath);
  if (!fs.existsSync(absoluteRepoPath)) {
    console.error(`Error: Path does not exist: ${absoluteRepoPath}`);
    process.exit(1);
  }

  console.log(`\n========================================================`);
  console.log(`Cartograph Parser — Running analysis`);
  console.log(`Target: ${absoluteRepoPath}`);
  console.log(`========================================================\n`);

  const startTime = Date.now();
  const result = await parseRepository(absoluteRepoPath);
  const elapsedMs = Date.now() - startTime;

  const { coverage, files, edges, folders } = result;

  console.log(`1. File Discovery & Parsing:`);
  console.log(`   Files found:   ${coverage.filesFound}`);
  console.log(`   Files parsed:  ${coverage.filesParsed}`);
  console.log(`   Files skipped: ${coverage.filesSkipped}`);
  const sumCheck =
    coverage.filesParsed + coverage.filesSkipped === coverage.filesFound;
  console.log(
    `   Verification:  ${coverage.filesParsed} parsed + ${coverage.filesSkipped} skipped = ${coverage.filesFound} found (${
      sumCheck ? 'PASS' : 'FAIL'
    })`
  );

  console.log(`\n2. Skip Reasons Breakdown:`);
  for (const [reason, count] of Object.entries(coverage.skipReasonsSummary)) {
    console.log(`   - ${reason}: ${count}`);
  }

  console.log(`\n3. Structure & Folders:`);
  console.log(`   Distinct folders: ${folders.length}`);
  if (folders.length <= 20) {
    for (const f of folders) {
      console.log(`     * ${f}`);
    }
  } else {
    for (const f of folders.slice(0, 10)) {
      console.log(`     * ${f}`);
    }
    console.log(`     ... and ${folders.length - 10} more`);
  }

  console.log(`\n4. Imports & Resolution:`);
  console.log(`   Total imports seen:    ${coverage.imports.total}`);
  console.log(`   Resolved internal:     ${coverage.imports.internal} (produced ${edges.length} unique edges)`);
  console.log(`   Resolved external:     ${coverage.imports.external} (${coverage.externalPackages.length} packages)`);
  console.log(`   Deliberately excluded: ${coverage.imports.excluded}`);
  console.log(`   Failed / unresolved:   ${coverage.imports.unresolved}`);

  console.log(`\n5. Re-exports (Barrel Files):`);
  console.log(`   Re-exports found:      ${coverage.reExports.found}`);
  console.log(`   Re-exports resolved:   ${coverage.reExports.resolved}`);
  console.log(`   Re-exports unresolved: ${coverage.reExports.unresolved}`);

  if (coverage.reExports.gaps.length > 0) {
    console.log(`   Re-export gaps with named reasons:`);
    for (const gap of coverage.reExports.gaps) {
      console.log(`     - [${gap.sourceFile}:${gap.line ?? '?'}] "${gap.specifier}": ${gap.reason}`);
    }
  }

  if (coverage.unresolvedImports.length > 0) {
    console.log(`\n6. Unresolved Imports (${coverage.unresolvedImports.length}):`);
    for (const unres of coverage.unresolvedImports) {
      console.log(
        `   - [${unres.sourceFile}:${unres.line ?? '?'}] (${unres.kind}) "${unres.specifier}"`
      );
      console.log(`     Reason: ${unres.reason}`);
    }
  }

  // Top hubs by fan-in / fan-out
  const topFanIn = [...files].sort((a, b) => b.fanIn - a.fanIn).slice(0, 5);
  const topFanOut = [...files].sort((a, b) => b.fanOut - a.fanOut).slice(0, 5);

  console.log(`\n7. Graph Connectivity:`);
  console.log(`   Highest Fan-In (most imported):`);
  for (const f of topFanIn) {
    if (f.fanIn > 0) {
      console.log(`     ${f.path.padEnd(45)} fanIn=${f.fanIn}`);
    }
  }
  console.log(`   Highest Fan-Out (most imports):`);
  for (const f of topFanOut) {
    if (f.fanOut > 0) {
      console.log(`     ${f.path.padEnd(45)} fanOut=${f.fanOut}`);
    }
  }

  if (outputFile) {
    const outputAbs = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(outputAbs), { recursive: true });
    fs.writeFileSync(outputAbs, JSON.stringify(result, null, 2), 'utf-8');
    const bytes = fs.statSync(outputAbs).size;
    console.log(`\n8. Output Contract:`);
    console.log(`   Written to: ${outputAbs} (${bytes} bytes)`);
  }

  console.log(`\nCompleted in ${elapsedMs}ms.\n`);
}

main().catch((err) => {
  console.error('Fatal parser error:', err);
  process.exit(1);
});
