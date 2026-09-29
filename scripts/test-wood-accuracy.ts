import 'dotenv/config';
import { runWoodBenchmarkEvaluation } from '../server/woodBenchmark.ts';

async function main() {
  console.log('=============================================================================');
  console.log('JAI HANUMAN DOOR — TIMBER ACCURACY BENCHMARK & EVALUATION TEST RUNNER');
  console.log('=============================================================================');
  console.log('Evaluating AI Wood Detector on documented wood anatomical test specimens...\n');

  try {
    const result = await runWoodBenchmarkEvaluation();

    console.log('\n=============================================================================');
    console.log('BENCHMARK EVALUATION SUMMARY REPORT');
    console.log('=============================================================================');
    console.log(`Total Specimen Tests:          ${result.totalTests}`);
    console.log(`Correct Identifications:      ${result.correctIdentifications}`);
    console.log(`Measured Accuracy:             ${result.accuracyRate}%`);
    console.log(`Sagwan vs Sal Confusion:       ${result.sagwanSalConfusionCount} (Must be 0 to prevent false Teak sales)`);
    console.log(`Sagwan vs Sheesham Confusion:  ${result.sagwanSheeshamConfusionCount}`);
    console.log(`False Confident Mistakes:      ${result.falseConfidentCount}`);
    console.log(`Honest Refusals on Blurry:     ${result.honestRefusalCount}`);
    console.log('-----------------------------------------------------------------------------');

    console.log('\nSPECIMEN-BY-SPECIMEN BREAKDOWN:');
    result.details.forEach(d => {
      const status = d.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} [${d.sampleId}] Expected: "${d.expectedSpecies}" -> Predicted: "${d.predictedSpecies}" (${d.confidence} Confidence)`);
      if (d.notes) console.log(`   Notes: ${d.notes}`);
    });

    console.log('\nBenchmark completed successfully.');
  } catch (err) {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  }
}

main();
