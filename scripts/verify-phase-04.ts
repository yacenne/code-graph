#!/usr/bin/env node
import { sampleRepoData } from '../lib/scaffold/sample-data';
import { foldRepository } from '../lib/canvas/folding';
import { computeGraphLayout } from '../lib/canvas/layout';

function verifyPhase04() {
  console.log('========================================================');
  console.log('Cartograph Phase 4 Acceptance Check');
  console.log('Dataset: trpc/packages (scaffolding)');
  console.log('========================================================\n');

  const files = sampleRepoData.files;
  const edges = sampleRepoData.edges;

  console.log(`Input Statistics:`);
  console.log(`- Total parsed files: ${files.length}`);
  console.log(`- Total dependency edges: ${edges.length}`);
  console.log(`- Distinct original folders: ${sampleRepoData.folders.length}\n`);

  const folding = foldRepository(files, edges, 24);
  const { acceptanceCheck, nodes } = folding;

  console.log(`1. Node Count Check:`);
  console.log(`   - Selected folding threshold: ${folding.threshold}`);
  console.log(`   - Resulting folded node count: ${acceptanceCheck.nodeCount}`);
  console.log(`   - Ratio: 1 node per ${(files.length / acceptanceCheck.nodeCount).toFixed(1)} files`);
  const check1Pass = acceptanceCheck.nodeCount <= 24 && acceptanceCheck.nodeCount >= 10;
  console.log(`   - Status: ${check1Pass ? 'PASS' : 'FAIL'} (under roughly two dozen, region of 1 node per 10 files)\n`);

  console.log(`2. Minimum Files Per Node Check:`);
  console.log(`   - Minimum files held by any node: ${acceptanceCheck.minFilesPerNode}`);
  const singleFileNodes = nodes.filter((n) => n.fileCount === 1);
  console.log(`   - Single file nodes: ${singleFileNodes.length}`);
  const check2Pass = acceptanceCheck.allNodesMoreThanOneFile && singleFileNodes.length === 0;
  console.log(`   - Status: ${check2Pass ? 'PASS' : 'FAIL'} (every node holds more than one file)\n`);

  console.log(`3. Edge Termination Check:`);
  console.log(`   - Edges evaluated: ${acceptanceCheck.edgesChecked}`);
  console.log(`   - Edges terminating on existing node: ${acceptanceCheck.terminatedEdgesCount}`);
  const check3Pass = acceptanceCheck.allEdgesTerminate;
  console.log(`   - Status: ${check3Pass ? 'PASS' : 'FAIL'} (every edge terminates on a node that exists)\n`);

  console.log(`Folded Nodes Overview:`);
  nodes.forEach((n, idx) => {
    console.log(
      `   [${(idx + 1).toString().padStart(2, ' ')}] ${n.label.padEnd(28)} | ${n.fileCount
        .toString()
        .padStart(3, ' ')} files | fan-in: ${n.fanIn.toString().padStart(2, ' ')} | fan-out: ${n.fanOut
        .toString()
        .padStart(2, ' ')} | dims: ${n.width}x${n.height}px`
    );
  });

  // Test layout computation
  console.log(`\n4. Deterministic Layout Verification:`);
  const openTestSet = new Set<string>([nodes[0].id]);
  const layout1 = computeGraphLayout(folding, openTestSet, null);
  const layout2 = computeGraphLayout(folding, openTestSet, null);

  let layoutIdentical = true;
  for (let i = 0; i < layout1.nodes.length; i++) {
    const pos1 = layout1.nodes[i].position;
    const pos2 = layout2.nodes[i].position;
    if (pos1.x !== pos2.x || pos1.y !== pos2.y) {
      layoutIdentical = false;
      break;
    }
  }
  console.log(`   - Layout deterministic reproducibility: ${layoutIdentical ? 'PASS' : 'FAIL'}`);
  console.log(`   - Rendered React Flow nodes: ${layout1.nodes.length}`);
  console.log(`   - Rendered React Flow edges: ${layout1.edges.length}\n`);

  const allPass = check1Pass && check2Pass && check3Pass && layoutIdentical;
  console.log(`========================================================`);
  console.log(`Acceptance Check Verification: ${allPass ? 'ALL CHECKS PASSED' : 'FAILED'}`);
  console.log(`========================================================\n`);

  if (!allPass) {
    process.exit(1);
  }
}

verifyPhase04();
