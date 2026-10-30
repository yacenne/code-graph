#!/usr/bin/env node
import { sampleRepoData, excalidrawRepoData } from '../lib/scaffold/sample-data';
import {
  transitiveWalk,
  isFrameworkReachable,
  detectImportCyclesIterative,
  computeRepositoryInsights,
  INSIGHT_SENTENCES,
} from '../lib/canvas/graph-math';
import { foldRepository } from '../lib/canvas/folding';
import { deriveCategories, classifyFileCategory } from '../lib/canvas/categories';

function verifyPhase06() {
  console.log('========================================================');
  console.log('Cartograph Phase 6 Verification Script');
  console.log('========================================================\n');

  // -------------------------------------------------------------------
  // 1. Transitive Walk: Blast Radius & Dependency Chain
  // -------------------------------------------------------------------
  console.log('1. Transitive Walk (Blast Radius & Dependency Chain):');

  // Test with trpc dataset
  const testFile = 'server/src/unstable-core-do-not-import/utils.ts';
  const blastRadius = transitiveWalk(sampleRepoData.edges, testFile, 'blastRadius', 2);
  const dependencyChain = transitiveWalk(sampleRepoData.edges, testFile, 'dependencies', 2);

  console.log(`   Target file: ${testFile}`);
  console.log(`   - Blast radius count (2 hops): ${blastRadius.length}`);
  console.log(`   - Dependency chain count (2 hops): ${dependencyChain.length}`);

  // Verification:
  // Every item at depth 1 in blast radius must directly import testFile
  const directDependents = new Set(
    sampleRepoData.edges.filter((e) => e.target === testFile).map((e) => e.source)
  );
  const blastDepth1 = blastRadius.filter((b) => b.depth === 1);
  const allBlastDepth1Direct = blastDepth1.every((b) => directDependents.has(b.path));
  console.log(
    `   - Blast radius Depth 1 accuracy: ${allBlastDepth1Direct ? 'PASS' : 'FAIL'} (${blastDepth1.length} files)`
  );

  // Every item at depth 2 in blast radius must import a depth 1 file
  const blastDepth1Set = new Set(blastDepth1.map((b) => b.path));
  const blastDepth2 = blastRadius.filter((b) => b.depth === 2);
  const allBlastDepth2Valid = blastDepth2.every((b) =>
    sampleRepoData.edges.some((e) => e.source === b.path && blastDepth1Set.has(e.target))
  );
  console.log(
    `   - Blast radius Depth 2 accuracy: ${allBlastDepth2Valid ? 'PASS' : 'FAIL'} (${blastDepth2.length} files)`
  );

  // Every item at depth 1 in dependency chain must be directly imported by testFile
  const directDependencies = new Set(
    sampleRepoData.edges.filter((e) => e.source === testFile).map((e) => e.target)
  );
  const depDepth1 = dependencyChain.filter((d) => d.depth === 1);
  const allDepDepth1Direct = depDepth1.every((d) => directDependencies.has(d.path));
  console.log(
    `   - Dependency chain Depth 1 accuracy: ${allDepDepth1Direct ? 'PASS' : 'FAIL'} (${depDepth1.length} files)`
  );

  // Depth 2 in dependency chain must be imported by a depth 1 file
  const depDepth1Set = new Set(depDepth1.map((d) => d.path));
  const depDepth2 = dependencyChain.filter((d) => d.depth === 2);
  const allDepDepth2Valid = depDepth2.every((d) =>
    sampleRepoData.edges.some((e) => depDepth1Set.has(e.source) && e.target === d.path)
  );
  console.log(
    `   - Dependency chain Depth 2 accuracy: ${allDepDepth2Valid ? 'PASS' : 'FAIL'} (${depDepth2.length} files)\n`
  );

  // -------------------------------------------------------------------
  // 2. Framework Reachable Exclusion (Acceptance Check 2)
  // -------------------------------------------------------------------
  console.log('2. Framework Reachable Exclusion (Acceptance Check 2):');
  console.log('   "Pick a file you know nothing imports. It appears in the insights panel.');
  console.log('    Now pick a page or a route that nothing imports. It does not."');

  const frameworkFiles = [
    'app/page.tsx',
    'app/layout.tsx',
    'app/api/users/route.ts',
    'pages/api/hello.ts',
    'proxy.ts',
    'middleware.ts',
    'next.config.ts',
    'tailwind.config.js',
  ];
  const allFrameworkExcluded = frameworkFiles.every((p) => isFrameworkReachable(p));
  console.log(
    `   - Framework files recognized and excluded from orphans: ${allFrameworkExcluded ? 'PASS' : 'FAIL'}`
  );

  const nonFrameworkFiles = [
    'lib/utils/calculator.ts',
    'server/src/helpers/orphan.ts',
    'packages/math/src/helper.ts',
  ];
  const allNonFrameworkIncluded = nonFrameworkFiles.every((p) => !isFrameworkReachable(p));
  console.log(
    `   - Regular modules recognized as non-framework: ${allNonFrameworkIncluded ? 'PASS' : 'FAIL'}\n`
  );

  // -------------------------------------------------------------------
  // 3. Iterative Cycle Detection & Verification (Acceptance Check 3)
  // -------------------------------------------------------------------
  console.log('3. Iterative Cycle Detection & Verification (Acceptance Check 3):');
  const cycles = detectImportCyclesIterative(sampleRepoData.files, sampleRepoData.edges);
  console.log(`   - Cycles found in trpc/packages: ${cycles.length}`);

  let allCyclesValid = cycles.length > 0;
  for (const cycle of cycles) {
    // Check that each step in the cycle actually corresponds to a real edge
    for (let i = 0; i < cycle.length - 1; i++) {
      const u = cycle[i];
      const v = cycle[i + 1];
      const edgeExists = sampleRepoData.edges.some((e) => e.source === u && e.target === v);
      if (!edgeExists) {
        console.error(`Invalid cycle step: ${u} -> ${v}`);
        allCyclesValid = false;
        break;
      }
    }
    if (!allCyclesValid) break;
  }
  console.log(`   - All cycles verified against real parser edges: ${allCyclesValid ? 'PASS' : 'FAIL'}`);
  if (cycles.length > 0) {
    console.log(`   - Sample confirmed cycle:`);
    console.log(`     ${cycles[0].join(' -> ')}\n`);
  }

  // -------------------------------------------------------------------
  // 4. Four Kinds of Insights & Ordering Constraints
  // -------------------------------------------------------------------
  console.log('4. Insights Computation & Ordering Constraints:');
  const insights = computeRepositoryInsights(sampleRepoData);
  console.log(`   - Total facts discovered: ${insights.totalFacts}`);

  const sectionKinds = insights.sections.map((s) => s.kind);
  const expectedOrder = ['unimported', 'high-fan-in', 'cycle', 'oversized'];
  const orderMatches = JSON.stringify(sectionKinds) === JSON.stringify(expectedOrder);
  console.log(
    `   - Section order: ${orderMatches ? 'PASS' : 'FAIL'} (unimported leads, followed by high-fan-in, cycles, oversized)`
  );

  const fixedStringsMatch =
    insights.sections[0].sentence === INSIGHT_SENTENCES.unimported &&
    insights.sections[1].sentence === INSIGHT_SENTENCES['high-fan-in'] &&
    insights.sections[2].sentence === INSIGHT_SENTENCES.cycle &&
    insights.sections[3].sentence === INSIGHT_SENTENCES.oversized;
  console.log(
    `   - Fixed strings strictly match: ${fixedStringsMatch ? 'PASS' : 'FAIL'}\n`
  );

  // -------------------------------------------------------------------
  // 5. Left Rail Category Sum Invariant (Acceptance Check 4)
  // -------------------------------------------------------------------
  console.log('5. Rail Category Match Invariant (Acceptance Check 4):');
  console.log('   "each panel\'s match count adds up to the number the rail shows."');

  const folding = foldRepository(sampleRepoData.files, sampleRepoData.edges, 24);
  const categories = deriveCategories(sampleRepoData.files);

  let allCategorySumsMatch = true;
  for (const cat of categories) {
    let panelMatchSum = 0;
    for (const node of folding.nodes) {
      const matchInNode = node.files.filter((f) => classifyFileCategory(f.path) === cat.id).length;
      panelMatchSum += matchInNode;
    }
    const matches = panelMatchSum === cat.count;
    if (!matches) {
      console.error(`Category ${cat.name}: panel sum ${panelMatchSum} !== rail count ${cat.count}`);
      allCategorySumsMatch = false;
    }
    console.log(`   - Category [${cat.name}]: rail=${cat.count}, panel sum=${panelMatchSum} -> ${matches ? 'OK' : 'MISMATCH'}`);
  }
  console.log(`   - Status (trpc/packages): ${allCategorySumsMatch ? 'PASS' : 'FAIL'}`);

  // Also verify Excalidraw dataset invariant
  const exFolding = foldRepository(excalidrawRepoData.files, excalidrawRepoData.edges, 24);
  const exCategories = deriveCategories(excalidrawRepoData.files);
  let allExCategorySumsMatch = true;
  for (const cat of exCategories) {
    let panelMatchSum = 0;
    for (const node of exFolding.nodes) {
      panelMatchSum += node.files.filter((f) => classifyFileCategory(f.path) === cat.id).length;
    }
    if (panelMatchSum !== cat.count) {
      allExCategorySumsMatch = false;
    }
  }
  console.log(`   - Status (excalidraw/excalidraw): ${allExCategorySumsMatch ? 'PASS' : 'FAIL'}\n`);

  // Overall result
  const passed =
    allBlastDepth1Direct &&
    allBlastDepth2Valid &&
    allDepDepth1Direct &&
    allDepDepth2Valid &&
    allFrameworkExcluded &&
    allNonFrameworkIncluded &&
    allCyclesValid &&
    orderMatches &&
    fixedStringsMatch &&
    allCategorySumsMatch &&
    allExCategorySumsMatch;

  console.log('========================================================');
  console.log(`Phase 6 Verification: ${passed ? 'ALL CHECKS PASSED' : 'FAILED'}`);
  console.log('========================================================\n');

  if (!passed) {
    process.exit(1);
  }
}

verifyPhase06();
