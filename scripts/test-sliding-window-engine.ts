import assert from 'node:assert/strict';
import { createDefaultFabricationProfiles } from '../src/data/slidingWindowDefaults.ts';
import { calculateSlidingWindowFabrication } from '../src/lib/slidingWindowEngine.ts';
import { buildTechnicalDrawingSvgMarkup } from '../src/lib/slidingWindowDrawingSvg.ts';
import { normalizeAndValidateExtractedRows } from '../server/aiNotebookScanner.ts';
import type { FabricationProfile, SlidingWindowInput } from '../src/types.ts';

function cloneProfile(profile: FabricationProfile): FabricationProfile {
  return JSON.parse(JSON.stringify(profile));
}

function runAllTests() {
  const [twoTrackStd, threeTrackStd] = createDefaultFabricationProfiles('unit-test-owner');

  // TEST 1: 2-Track Standard Sample Values (36" x 48")
  {
    const input: SlidingWindowInput = {
      id: 'w-2t-sample',
      windowNumber: 'W-01',
      width: 36,
      height: 48,
      unit: 'inch',
      trackType: '2-track',
      configuration: '2 Glass Panels',
      glassThickness: '5mm Clear / Toughened',
      mosquitoNetRequired: false,
      profileId: twoTrackStd.id,
    };

    const res = calculateSlidingWindowFabrication(input, twoTrackStd);
    assert.equal(res.isValid, true, '2-Track sample must be valid');
    assert.equal(res.fabrication.topTrackInch, 36, 'Top Track = 36"');
    assert.equal(res.fabrication.bottomTrackInch, 36, 'Bottom Track = 36"');
    assert.equal(res.fabrication.handleInch, 46.5, 'Handle = 48 - 1.5 = 46.5"');
    assert.equal(res.fabrication.interlockInch, 46.5, 'Interlock = 48 - 1.5 = 46.5"');
    assert.equal(res.glassPanels.length, 2, '2 glass panels expected');
    assert.equal(res.glassPanels[0].widthInch, 15.5, 'Glass Panel 1 Width = (36 - 6.25)/2 + 0.625 = 15.5"');
    assert.equal(res.glassPanels[0].heightInch, 44, 'Glass Panel 1 Height = 48 - 1.5 - 2.5 = 44"');
    assert.equal(res.glassPanels[1].widthInch, 15.5, 'Glass Panel 2 Width = 15.5"');
    assert.equal(res.glassPanels[1].heightInch, 44, 'Glass Panel 2 Height = 44"');
    assert.equal(res.mosquitoNetPanels.length, 0, 'No mosquito net on 2-track default');
    console.log('✅ Test 1 PASSED: 2-Track Standard (36" × 48") -> Top/Bottom 36", Handle/Interlock 46.5", Glass 15.5" × 44"');
  }

  // TEST 2: 3-Track Standard Sample Values (36" x 48" with Mosquito Net)
  {
    const input: SlidingWindowInput = {
      id: 'w-3t-sample',
      windowNumber: 'W-02',
      width: 36,
      height: 48,
      unit: 'inch',
      trackType: '3-track',
      configuration: '2 Glass + 1 Mosquito Net',
      glassThickness: '5mm Clear / Toughened',
      mosquitoNetRequired: true,
      profileId: threeTrackStd.id,
    };

    const res = calculateSlidingWindowFabrication(input, threeTrackStd);
    assert.equal(res.isValid, true, '3-Track sample must be valid');
    assert.equal(res.glassPanels.length, 2);
    assert.equal(res.mosquitoNetPanels.length, 1);
    assert.equal(res.glassPanels[0].widthInch, 15.5);
    assert.equal(res.glassPanels[0].heightInch, 44);
    assert.equal(res.mosquitoNetPanels[0].widthInch, 15.5);
    assert.equal(res.mosquitoNetPanels[0].heightInch, 44);
    console.log('✅ Test 2 PASSED: 3-Track Standard (36" × 48") -> 2 Glass + 1 Mosquito Net calculated accurately');
  }

  // TEST 3: 3-Track Independent Mosquito Net Rules + Separate Handle & Interlock Deductions + Track Adjustments
  {
    const custom3T = cloneProfile(threeTrackStd);
    custom3T.name = '3 Track Custom Workshop';
    custom3T.rules.topTrackAdjustment.value = 0.25;
    custom3T.rules.topTrackAdjustment.operator = '-';
    custom3T.rules.bottomTrackAdjustment.value = 0.125;
    custom3T.rules.bottomTrackAdjustment.operator = '-';
    custom3T.rules.handleHeightDeduction.value = 1.5;
    custom3T.rules.interlockHeightDeduction.value = 1.75; // Different from Handle!
    // Separate Mosquito Net rules different from Glass
    custom3T.rules.mosquitoNetWidthDeduction.value = 5.5;
    custom3T.rules.mosquitoNetWidthAddition.value = 0.5;
    custom3T.rules.mosquitoNetHeightDeduction.value = 2.0;

    const input: SlidingWindowInput = {
      id: 'w-3t-custom',
      windowNumber: 'W-03',
      width: 36,
      height: 48,
      unit: 'inch',
      trackType: '3-track',
      configuration: '2 Glass + 1 Mosquito Net',
      glassThickness: '6mm Toughened',
      mosquitoNetRequired: true,
      profileId: custom3T.id,
    };

    const res = calculateSlidingWindowFabrication(input, custom3T);
    assert.equal(res.isValid, true);
    assert.equal(res.fabrication.topTrackInch, 35.75, 'Top Track = 36 - 0.25 = 35.75"');
    assert.equal(res.fabrication.bottomTrackInch, 35.875, 'Bottom Track = 36 - 0.125 = 35.875"');
    assert.equal(res.fabrication.handleInch, 46.5, 'Handle = 48 - 1.5 = 46.5"');
    assert.equal(res.fabrication.interlockInch, 46.25, 'Interlock = 48 - 1.75 = 46.25"');
    // Glass unchanged: (36 - 6.25)/2 + 0.625 = 15.5, H = 46.5 - 2.5 = 44
    assert.equal(res.glassPanels[0].widthInch, 15.5);
    assert.equal(res.glassPanels[0].heightInch, 44);
    // Mosquito Net independent: (36 - 5.5)/2 + 0.5 = 15.25 + 0.5 = 15.75, H = 46.5 - 2.0 = 44.5
    assert.equal(res.mosquitoNetPanels[0].widthInch, 15.75, 'Mosquito Net Width = (36 - 5.5)/2 + 0.5 = 15.75"');
    assert.equal(res.mosquitoNetPanels[0].heightInch, 44.5, 'Mosquito Net Height = 46.5 - 2.0 = 44.5"');
    console.log('✅ Test 3 PASSED: Independent Mosquito Net, Interlock, Top/Bottom Track rules verified');
  }

  // TEST 4: Asymmetric Per-Panel Custom Overrides (Do not assume all panels are equal)
  {
    const asymProfile = cloneProfile(twoTrackStd);
    asymProfile.panelArrangements[0].extraWidthAdjustment = 0.25;
    asymProfile.panelArrangements[0].extraWidthOperator = '+';
    asymProfile.panelArrangements[1].extraWidthAdjustment = 0.25;
    asymProfile.panelArrangements[1].extraWidthOperator = '-';

    const res = calculateSlidingWindowFabrication(
      {
        id: 'w-asym',
        windowNumber: 'W-04',
        width: 36,
        height: 48,
        unit: 'inch',
        trackType: '2-track',
        configuration: '2 Glass Panels (Custom Split)',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: false,
      },
      asymProfile
    );
    assert.equal(res.isValid, true);
    assert.equal(res.glassPanels[0].widthInch, 15.75, 'Panel 1 = 15.5 + 0.25 = 15.75"');
    assert.equal(res.glassPanels[1].widthInch, 15.25, 'Panel 2 = 15.5 - 0.25 = 15.25"');
    console.log('✅ Test 4 PASSED: Asymmetric per-panel overrides verified (15.75" vs 15.25")');
  }

  // TEST 5: Feet & Millimeter Unit Conversions
  {
    // 3 ft x 4 ft === 36 in x 48 in
    const feetRes = calculateSlidingWindowFabrication(
      {
        id: 'w-ft',
        windowNumber: 'W-05',
        width: 3,
        height: 4,
        unit: 'feet',
        trackType: '2-track',
        configuration: '2 Glass Panels',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: false,
      },
      twoTrackStd
    );
    assert.equal(feetRes.isValid, true);
    assert.equal(feetRes.glassPanels[0].widthInch, 15.5);
    assert.equal(feetRes.glassPanels[0].heightInch, 44);

    // 914.4 mm x 1219.2 mm === 36 in x 48 in
    const mmRes = calculateSlidingWindowFabrication(
      {
        id: 'w-mm',
        windowNumber: 'W-06',
        width: 914.4,
        height: 1219.2,
        unit: 'mm',
        trackType: '2-track',
        configuration: '2 Glass Panels',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: false,
      },
      twoTrackStd
    );
    assert.equal(mmRes.isValid, true);
    assert.equal(mmRes.glassPanels[0].widthInch, 15.5);
    assert.equal(mmRes.glassPanels[0].heightInch, 44);
    assert.equal(mmRes.glassPanels[0].widthMm, 393.7);
    assert.equal(mmRes.glassPanels[0].heightMm, 1117.6);
    console.log('✅ Test 5 PASSED: Feet & Millimeter unit conversions verified');
  }

  // TEST 6: Missing Rule Validation Guard (Never produce fake dimensions)
  {
    const brokenProfile = cloneProfile(threeTrackStd);
    delete (brokenProfile.rules as any).mosquitoNetWidthDeduction;

    const brokenRes = calculateSlidingWindowFabrication(
      {
        id: 'w-broken',
        windowNumber: 'W-07',
        width: 36,
        height: 48,
        unit: 'inch',
        trackType: '3-track',
        configuration: '2 Glass + 1 Mosquito Net',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: true,
      },
      brokenProfile
    );
    assert.equal(brokenRes.isValid, false, 'Missing mosquito net rule must fail validation');
    assert.ok(brokenRes.errors.some(e => e.includes('mosquitoNetWidthDeduction')));
    assert.equal(brokenRes.glassPanels.length, 0, 'Must not output unverified dimensions when invalid');
    console.log('✅ Test 6 PASSED: Missing profile rule blocked without producing fake dimensions');
  }

  // TEST 7: Default Top & Bottom Track (T.B.) Bearing Measurement (36" Window -> 14.875")
  {
    const res = calculateSlidingWindowFabrication(
      {
        id: 'w-bearing-std',
        windowNumber: 'W-B1',
        width: 36,
        height: 48,
        unit: 'inch',
        trackType: '2-track',
        configuration: '2 Glass Panels',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: false,
      },
      twoTrackStd
    );
    assert.equal(res.isValid, true);
    assert.equal(res.fabrication.bearingRemainingInch, 29.75, 'Remaining Width = 36 - 6.25 = 29.75"');
    assert.equal(res.fabrication.topBearingInch, 14.875, 'Top Bearing (T.B.) = 29.75 / 2 = 14.875"');
    assert.equal(res.fabrication.bottomBearingInch, 14.875, 'Bottom Bearing (T.B.) = 29.75 / 2 = 14.875"');
    assert.equal(res.glassPanels[0].widthInch, 15.5, 'Glass width must remain 15.5"');
    console.log('✅ Test 7 PASSED: Bearing Measurement default (36" -> 29.75" / 2 = 14.875" Top & Bottom T.B.)');
  }

  // TEST 8: Separately Editable Top vs Bottom Bearing Adjustments (Zero Impact on Glass)
  {
    const asymBearingProfile = cloneProfile(twoTrackStd);
    asymBearingProfile.rules.topBearingAdjustment.value = 0.25;
    asymBearingProfile.rules.topBearingAdjustment.operator = '+';
    asymBearingProfile.rules.bottomBearingAdjustment.value = 0.125;
    asymBearingProfile.rules.bottomBearingAdjustment.operator = '-';

    const res = calculateSlidingWindowFabrication(
      {
        id: 'w-bearing-asym',
        windowNumber: 'W-B2',
        width: 36,
        height: 48,
        unit: 'inch',
        trackType: '2-track',
        configuration: '2 Glass Panels',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: false,
      },
      asymBearingProfile
    );
    assert.equal(res.isValid, true);
    assert.equal(res.fabrication.topBearingInch, 15.125, 'Top Bearing = 14.875 + 0.25 = 15.125"');
    assert.equal(res.fabrication.bottomBearingInch, 14.75, 'Bottom Bearing = 14.875 - 0.125 = 14.75"');
    assert.equal(res.glassPanels[0].widthInch, 15.5, 'Glass width must NOT change when Bearing rules change');
    console.log('✅ Test 8 PASSED: Separate Top (15.125") & Bottom (14.75") T.B. Bearing rules without altering Glass (15.5")');
  }

  // TEST 9: Dynamic SVG Technical Drawing Generation (2-Track & 3-Track)
  {
    const res2T = calculateSlidingWindowFabrication(
      {
        id: 'w-svg-2t',
        windowNumber: 'W-DRAW-2T',
        width: 36,
        height: 48,
        unit: 'inch',
        trackType: '2-track',
        configuration: '2 Glass Panels',
        glassThickness: '5mm Clear / Toughened',
        mosquitoNetRequired: false,
      },
      twoTrackStd
    );
    const svg2T = buildTechnicalDrawingSvgMarkup(res2T, {
      projectName: 'Sharma Villa',
      customerName: 'Rajesh Sharma',
    });
    assert.ok(svg2T.startsWith('<svg '), 'Must generate valid SVG root element');
    assert.ok(svg2T.includes('W-DRAW-2T'));
    assert.ok(svg2T.includes('TOP BEARING (T.B.): 14.875&quot;'));
    assert.ok(svg2T.includes('BOTTOM BEARING (T.B.): 14.875&quot;'));
    assert.ok(svg2T.includes('15.5&quot; × 44&quot;'));

    const res3T = calculateSlidingWindowFabrication(
      {
        id: 'w-svg-3t',
        windowNumber: 'W-DRAW-3T',
        width: 48,
        height: 48,
        unit: 'inch',
        trackType: '3-track',
        configuration: '2 Glass + 1 Mosquito Net',
        glassThickness: '6mm Toughened',
        mosquitoNetRequired: true,
      },
      threeTrackStd
    );
    const svg3T = buildTechnicalDrawingSvgMarkup(res3T, {
      projectName: 'Patel Apartment',
      customerName: 'Kiran Patel',
    });
    assert.ok(svg3T.includes('MOSQUITO NET'));
    assert.ok(svg3T.includes('20.875&quot;'), '3-Track 48" Bearing = (48 - 6.25)/2 = 20.875"');
    assert.ok(svg3T.includes('21.5&quot; × 44&quot;'), '3-Track 48" Panel = (48 - 6.25)/2 + 0.625 = 21.5"');
    console.log('✅ Test 9 PASSED: Dynamic 2-Track & 3-Track SVG Technical Drawings generated from real engine output');
  }

  // TEST 10: AI Notebook Scanner Post-Processor Safety Guards (Clear, Feet, Decimal, Unclear, Overwritten, Ambiguous Unit)
  {
    const extracted = normalizeAndValidateExtractedRows(
      [
        {
          windowNumber: 'W1',
          rawText: 'W1 = 36" × 48"',
          width: 36,
          height: 48,
          unit: 'inch',
          unitExplicit: true,
          confidence: 'High',
        },
        {
          windowNumber: 'W2',
          rawText: 'W2 = 4 × 3.5 Feet',
          width: 4,
          height: 3.5,
          unit: 'feet',
          unitExplicit: true,
          confidence: 'High',
        },
        {
          windowNumber: 'W3',
          rawText: 'W3 = 42.5 × 48.25 inch',
          width: 42.5,
          height: 48.25,
          unit: 'inch',
          unitExplicit: true,
          confidence: 'High',
        },
        {
          windowNumber: 'W4',
          rawText: 'W4 = 38? × [smudged]',
          width: 38,
          height: null,
          unit: 'inch',
          unitExplicit: false,
          confidence: 'High', // Even if model misreports High, guard MUST force Unclear
        },
        {
          windowNumber: 'W5',
          rawText: 'W5 = 36/38 × 48 (overwritten)',
          width: 38,
          height: 48,
          unit: 'inch',
          unitExplicit: true,
          confidence: 'High',
          crossedOutOrOverwritten: true,
          ambiguousDigits: true,
        },
        {
          windowNumber: 'W6',
          rawText: 'W6 = 4 × 5',
          width: 4,
          height: 5,
          unit: 'inch',
          unitExplicit: false,
          confidence: 'High', // Small unmarked number marked inch -> MUST warn Feet vs Inches
        },
      ],
      { pageId: 'page-1', pageNumber: 1, existingWindowCount: 0, defaultUnit: 'inch' }
    );

    assert.equal(extracted.length, 6);
    // W1 clear inch
    assert.equal(extracted[0].confidence, 'High');
    assert.equal(extracted[0].confirmed, true);
    assert.equal(extracted[0].originalAiSnapshot.width, 36);
    // W2 explicit feet with decimal preserved
    assert.equal(extracted[1].unit, 'feet');
    assert.equal(extracted[1].height, 3.5);
    assert.equal(extracted[1].confidence, 'High');
    // W3 decimal preserved accurately
    assert.equal(extracted[2].width, 42.5);
    assert.equal(extracted[2].height, 48.25);
    // W4 missing height MUST be forced Unclear & NOT confirmed
    assert.equal(extracted[3].confidence, 'Unclear');
    assert.equal(extracted[3].confirmed, false);
    assert.ok(extracted[3].flags.length > 0);
    // W5 overwritten/ambiguous digits MUST be downgraded to Review & NOT confirmed
    assert.equal(extracted[4].confidence, 'Review');
    assert.equal(extracted[4].confirmed, false);
    assert.ok(extracted[4].flags.some(f => f.toLowerCase().includes('overwritten')));
    // W6 small value in inch without explicit unit MUST flag Feet vs Inches
    assert.equal(extracted[5].confidence, 'Review');
    assert.equal(extracted[5].unitAmbiguous, true);
    assert.equal(extracted[5].confirmed, false);
    assert.ok(extracted[5].flags.some(f => f.toLowerCase().includes('feet or inches')));
    console.log('✅ Test 10 PASSED: AI Notebook Scanner safety guards enforce Unclear/Review & Feet-vs-Inches checks');
  }

  // TEST 11: Multi-Page Continuation + Confirmed Scanned Rows -> Existing Calculation Engine (Zero Profile Mutation)
  {
    const beforeSnapshot = JSON.stringify(threeTrackStd);
    const page2Rows = normalizeAndValidateExtractedRows(
      [
        {
          windowNumber: '', // Should auto-assign W7 when existingWindowCount=6
          rawText: 'Hall 4 × 3.5 ft',
          width: 4,
          height: 3.5,
          unit: 'feet',
          unitExplicit: true,
          confidence: 'High',
        },
        {
          windowNumber: 'Kitchen',
          rawText: 'Kitchen 36" × 48"',
          width: 36,
          height: 48,
          unit: 'inch',
          unitExplicit: true,
          confidence: 'High',
        },
      ],
      { pageId: 'page-2', pageNumber: 2, existingWindowCount: 6, defaultUnit: 'inch' }
    );

    assert.equal(page2Rows[0].windowNumber, 'W7', 'Multi-page continuation must auto-number W7');
    assert.equal(page2Rows[0].pageLabel, 'Page 2');

    // Feed confirmed scanned rows directly into existing calculation engine
    const calcInputs: SlidingWindowInput[] = page2Rows.map(r => ({
      id: r.id,
      windowNumber: r.windowNumber,
      width: r.width!,
      height: r.height!,
      unit: r.unit,
      trackType: '3-track',
      configuration: '2 Glass + 1 Mosquito Net',
      glassThickness: '5mm Clear / Toughened',
      mosquitoNetRequired: true,
      profileId: threeTrackStd.id,
    }));

    const results = calcInputs.map(inp => calculateSlidingWindowFabrication(inp, threeTrackStd));
    assert.equal(results.length, 2);
    // W7: 4ft x 3.5ft = 48" x 42" -> Top Bearing = (48-6.25)/2 = 20.875", Glass = 21.5" x 38"
    assert.equal(results[0].isValid, true);
    assert.equal(results[0].fabrication.topBearingInch, 20.875);
    assert.equal(results[0].glassPanels[0].widthInch, 21.5);
    assert.equal(results[0].glassPanels[0].heightInch, 38);
    assert.equal(results[0].mosquitoNetPanels.length, 1);
    // Kitchen: 36" x 48" -> Bearing 14.875", Glass 15.5" x 44"
    assert.equal(results[1].isValid, true);
    assert.equal(results[1].fabrication.topBearingInch, 14.875);
    assert.equal(results[1].glassPanels[0].widthInch, 15.5);
    assert.equal(results[1].glassPanels[0].heightInch, 44);
    // Saved profile must remain 100% untouched
    assert.equal(JSON.stringify(threeTrackStd), beforeSnapshot, 'Saved profile must never be modified');
    console.log('✅ Test 11 PASSED: Multi-page continuation & confirmed scanned measurements calculate via existing engine');
  }

  console.log('\n🎉 All 11 Sliding Window Fabrication & AI Notebook Scanner automated tests passed!');
}

runAllTests();

