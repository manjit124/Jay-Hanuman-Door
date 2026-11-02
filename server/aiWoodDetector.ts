import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { AIWoodAnalysisResult, WoodReferenceSample } from '../src/types.ts';
import { WOOD_SPECIES_PROFILES } from './woodAnatomyGuide.ts';
import { getWoodReferences } from './db.ts';

/**
 * Returns a configured GoogleGenAI client with server-side API key validation.
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ CRITICAL: GEMINI_API_KEY / GOOGLE_API_KEY environment variable is not defined on the server!');
    throw new Error('AI Wood Detector server API key is missing. Please configure GEMINI_API_KEY.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ImageInputPart {
  data: string; // base64 string
  mimeType: string;
  role?: 'full_door' | 'grain_closeup' | 'unpolished_edge' | 'end_grain' | 'general';
}

/**
 * Builds the comprehensive Wood Anatomical System Instruction for Gemini Vision.
 * Injects scientific botanical timber profiles and retrieved verified reference dataset items.
 */
function buildTimberSpecialistInstruction(verifiedReferences: WoodReferenceSample[]): string {
  const profilesSummary = Object.entries(WOOD_SPECIES_PROFILES)
    .map(([name, p]) => {
      return `### ${name} (Botanical: ${p.botanicalName || 'N/A'})
- Porosity: ${p.porosityType}
- Grain Pattern: ${p.grainPattern}
- Pores & Tyloses: ${p.poreStructureAndTyloses}
- Natural Colors: Heartwood: ${p.naturalColorHeartwood}; Sapwood: ${p.naturalColorSapwood}
- Texture & Surface: ${p.textureAndTactility}
- Growth Rings & Rays: ${p.growthRingsAndRays}
- Key Distinguishing Markers: ${p.distinguishingKeyFeatures.join('; ')}
- Common Imitation Traps: ${p.commonImitationRisks.join('; ')}`;
    })
    .join('\n\n');

  let verifiedDatasetSection = '';
  if (verifiedReferences.length > 0) {
    verifiedDatasetSection = `\n\n### VERIFIED WORKSHOP REFERENCE SAMPLES IN DATABASE (${verifiedReferences.length} Confirmed Samples Available):
` + verifiedReferences.map((r, idx) => `Sample #${idx + 1}: ${r.woodType} - Label: "${r.verifiedLabel}" (Source: ${r.source}). Notes: ${r.notes || 'None'}. Anatomical: ${JSON.stringify(r.anatomicalFeatures || {})}`).join('\n');
  } else {
    verifiedDatasetSection = `\n\n### VERIFIED WORKSHOP REFERENCE SAMPLES STATUS:
Note: The Jai Hanuman Door verified sample library is currently in initial configuration mode by the workshop administrator. Ground your identification on the detailed botanical anatomical timber criteria below, and clearly inform the user that photo-based inspection cannot provide 100% laboratory certification.`;
  }

  return `You are the Principal Timber Anatomist & Wood Identification Specialist for "Jai Hanuman Door", Maharashtra, India.
Your mission is to perform a rigorous, honest, multi-feature visual timber audit of door photos uploaded by homeowners and carpenters.

=============================================================================
TIMBER ANATOMICAL KNOWLEDGE BASE (BOTANICAL SPECIES PROFILES):
=============================================================================
${profilesSummary}
${verifiedDatasetSection}

=============================================================================
MANDATORY MULTI-FEATURE EVALUATION CRITERIA (NEVER RELY ON COLOR ALONE!):
=============================================================================
You MUST examine and cross-reference ALL of the following 10 visual dimensions:
1. GRAIN PATTERN & DIRECTION: Straight vs wavy vs deeply interlocked/spiral (Sal) vs wild fiddleback (Sheesham) vs rotary peeled arches (Plywood).
2. PORE SYSTEM & DISTRIBUTION: Ring-porous (Teak: concentric bands of conspicuous large earlywood pores) vs Diffuse-porous (Sal: evenly scattered pores with glistening whitish tyloses; Mango: scattered; Sheesham: diffuse with parenchymal bands) vs Non-porous (Deodar, Pine: no vessels!).
3. FIBROUSNESS & SURFACE TEXTURE: Smooth waxy/greasy natural feel (Teak) vs coarse splintery fibrousness (Sal) vs fine uniform tracheids (Deodar) vs plastic flat laminate.
4. SURFACE FINISH & STAIN MASKING: Is the wood coated in polyurethane (PU), melamine, tinted red/orange stain, varnish, or paint? Staining routinely turns Jungle Wood or Sal golden-brown to mimic Sagwan!
5. GROWTH RINGS & EARLYWOOD/LATEWOOD: Conspicuous annual rings with soft-hard transitions (Pine, Deodar, Teak) vs faint/indistinct (Sal, Tropical hardwoods).
6. RESIN CANALS & MINERAL STREAKS: White tangential dammar lines (Sal); purple-black streaks (Sheesham); multicolored green/pink spalting streaks (Mango); white calcium deposits in pores (Teak).
7. END-GRAIN APPEARANCE (if visible): Circular growth rings and pore vessel cross-sections vs horizontal cross-ply sandwich glue lines (Plywood) vs micro-thin 1mm face over composite core (Veneer).
8. NATURAL WOOD vs ENGINEERED/LAMINATE: Repeating symmetrical bookmatched seams (Veneered door); edge banding tape; repeating digital photographic print (Laminate/Sunmica).
9. UNPOLISHED / BARE TIMBER EVIDENCE: Check if unpolished edges (door top/bottom, hinge mortise, back side) reveal the true bare wood undertone.
10. JUNGLE WOOD ASSESSMENT: Remember "Jungle Wood" is a regional commercial trade term for mixed local hardwoods (Babool, Rubberwood, Silver Oak, Eucalyptus, etc.), NOT a single species. It often has irregular grain and is heavily stained to imitate Teak or Sheesham.

=============================================================================
CRITICAL ANTI-FALSE-SAGWAN (TEAK) & ACCURACY ENFORCEMENT RULES:
=============================================================================
1. THREE MANDATORY CLASSIFICATION CATEGORIES (wood_category):
   A) "Sagwan / Sagwani (Teak)":
      - Identify genuine teak wood ONLY when sufficient visual evidence supports it.
      - Requires observable ring-porous or semi-ring-porous vessel bands, distinct growth rings, natural golden-brown heartwood, and oily/waxy grain texture.
      - DO NOT identify a wood as Sagwan simply because it is golden, brown, shiny, or carved! Stained Sal and Jungle Wood are frequently polished in golden-yellow tints.
   
   B) "Other Wood (Non-Teak)":
      - If the wood does NOT have sufficient characteristics of teak, classify it as "Other Wood (Non-Teak)".
      - Show the likely wood species ONLY when there is sufficient visual evidence (e.g. Sheesham [wild dark fiddleback & purple streaks], Saal [dense coarse interlocking fiber & white tyloses], Neem, Mango, Babool, Pine [non-porous resinous tracheids], Plywood, Veneer, Laminate).
      - NEVER guess a species just to provide an answer.

   C) "Uncertain / Pehchan Confirm Nahi Ho Paayi":
      - If the image is unclear, blurry, dark, or insufficient to distinguish the species, or if the pore structure is completely obscured by thick dark paint or heavy polish, set category to "Uncertain / Pehchan Confirm Nahi Ho Paayi".
      - Set confidence_level to "Low" and is_image_sufficient to false.
      - Ask the user for a clearer photo of the wood grain and, if possible, an unpolished edge or end grain.

2. ACCURACY & CONFIDENCE RULES:
   - Do NOT automatically label unknown or ambiguous wood as Sagwan.
   - Do NOT use color alone to identify teak.
   - Do NOT confuse polished, stained, painted or laminated wood with genuine teak.
   - Distinguish visual observations from confirmed species identification.
   - Show a confidence score ("High", "Moderate", "Low"), but NEVER present photo analysis as 100% laboratory/microscopic certainty.
   - If confidence is "Low", return "Uncertain / Pehchan Confirm Nahi Ho Paayi" instead of a false Sagwan result.

=============================================================================
OUTPUT FORMAT REQUIREMENT:
=============================================================================
You MUST respond with a single, strictly valid JSON object adhering to this schema:
{
  "wood_category": "Sagwan / Sagwani (Teak)" | "Other Wood (Non-Teak)" | "Uncertain / Pehchan Confirm Nahi Ho Paayi",
  "likely_wood_type": "Sagwan (Teak)" | "Sheesham" | "Saal (Sal)" | "Neem" | "Mango Wood" | "Babool" | "Pine" | "Plywood" | "Veneered Wood" | "Laminated or engineered wood" | "Other Wood" | "Pehchan confirm nahi ho paayi (Clear photo required)",
  "is_image_sufficient": true | false,
  "confidence_level": "High" | "Moderate" | "Low",
  "visible_reasons": [
    "Reason 1 based on observed grain, pores, texture or surface finish",
    "Reason 2 distinguishing features noted"
  ],
  "visual_observations": [
    "Observation 1 (e.g. Ring-porous vs diffuse-porous vs non-porous structure)",
    "Observation 2 (e.g. Natural wood grain vs stain reflection/masking)"
  ],
  "visible_evidence": [
    "Specific observable feature matching the classified timber"
  ],
  "features_unassessed": [
    "Feature that could not be determined from the photo (e.g. end-grain cross section hidden, pores under thick PU coat, microscopic vessel anatomy)"
  ],
  "uncertainty_reasons": [
    "Primary cause of uncertainty (e.g. Surface polish tinting, flash glare, absence of unpolished wood photo)"
  ],
  "reasons_for_match": [
    "Scientific rationale explaining why the visible traits match the predicted species"
  ],
  "alternative_possibilities": ["Alternative 1 with reason", "Alternative 2 with reason"],
  "limitations": [
    "Clear disclosure that photo-based identification is an estimate and laboratory/microscopic examination may be required for 100% confirmation."
  ],
  "additional_photos_recommended": true | false,
  "photo_recommendations": [
    "Recommendation 1 (e.g. Darwaze ke top/bottom unpolished edge ki clear photo)",
    "Recommendation 2 (e.g. Natural daylight mein bina flash ke grain close-up)"
  ],
  "customer_explanation": "Honest, courteous Hindi/Hinglish explanation. State whether the photo shows genuine Sagwan, another wood species, or is uncertain. Caution about polish/stains.",
  "anti_false_sagwan_notice": "Clear disclaimer distinguishing visual resemblance from certified genuine teak.",
  "disclaimer": "Yeh analysis photo par aadharit anuman hai. 100% scientific guarantee ke liye physical/laboratory test ki zaroorat ho sakti hai.",
  "comparison_notes": {
    "Sagwan_vs_Other": "How this sample compares against genuine Teak.",
    "Solid_vs_Engineered": "Whether this is solid timber or engineered ply/veneer/laminate."
  }
}`;
}

/**
 * Sanitizes and parses the Gemini model output into a validated AIWoodAnalysisResult
 */
function parseGeminiJsonResponse(rawText: string): AIWoodAnalysisResult {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', cleaned);
    throw new Error('AI response could not be parsed as valid JSON.');
  }

  let confidenceLevel: 'Low' | 'Moderate' | 'High' =
    parsed.confidence_level === 'High' || parsed.confidence_level === 'Moderate' || parsed.confidence_level === 'Low'
      ? parsed.confidence_level
      : 'Moderate';

  let likelyWoodType = String(parsed.likely_wood_type || '').trim();
  const lowerLikely = likelyWoodType.toLowerCase();
  
  if (!likelyWoodType || lowerLikely.includes('unable') || lowerLikely.includes('could not') || lowerLikely.includes('confirm') || lowerLikely.includes('uncertain')) {
    likelyWoodType = 'Pehchan confirm nahi ho paayi (Clear photo required)';
    confidenceLevel = 'Low';
  }

  let isImageSufficient = typeof parsed.is_image_sufficient === 'boolean'
    ? parsed.is_image_sufficient
    : confidenceLevel !== 'Low';

  let woodCategory: 'Sagwan / Sagwani (Teak)' | 'Other Wood (Non-Teak)' | 'Uncertain / Pehchan Confirm Nahi Ho Paayi';

  // Force uncertain category if confidence is Low or image insufficient
  if (confidenceLevel === 'Low' || !isImageSufficient || likelyWoodType.includes('Pehchan confirm')) {
    woodCategory = 'Uncertain / Pehchan Confirm Nahi Ho Paayi';
    isImageSufficient = false;
    confidenceLevel = 'Low';
    if (!likelyWoodType.includes('Pehchan confirm')) {
      likelyWoodType = 'Pehchan confirm nahi ho paayi (Clear photo required)';
    }
  } else if (parsed.wood_category === 'Sagwan / Sagwani (Teak)' || lowerLikely.includes('sagwan') || lowerLikely.includes('teak')) {
    woodCategory = 'Sagwan / Sagwani (Teak)';
  } else if (parsed.wood_category === 'Other Wood (Non-Teak)' || parsed.wood_category === 'Other Wood') {
    woodCategory = 'Other Wood (Non-Teak)';
  } else {
    woodCategory = lowerLikely.includes('sagwan') || lowerLikely.includes('teak')
      ? 'Sagwan / Sagwani (Teak)'
      : 'Other Wood (Non-Teak)';
  }

  const visibleReasons: string[] = Array.isArray(parsed.visible_reasons) && parsed.visible_reasons.length > 0
    ? parsed.visible_reasons
    : Array.isArray(parsed.reasons_for_match) && parsed.reasons_for_match.length > 0
    ? parsed.reasons_for_match
    : Array.isArray(parsed.visual_observations)
    ? parsed.visual_observations
    : ['Visual features analyzed from uploaded photo.'];

  const visualObservations: string[] = Array.isArray(parsed.visual_observations)
    ? parsed.visual_observations
    : visibleReasons;

  const visibleEvidence: string[] = Array.isArray(parsed.visible_evidence)
    ? parsed.visible_evidence
    : visibleReasons;

  const featuresUnassessed: string[] = Array.isArray(parsed.features_unassessed)
    ? parsed.features_unassessed
    : ['End-grain cross-section and growth rings could not be inspected', 'Internal core density and seasoning level unverified'];

  const uncertaintyReasons: string[] = Array.isArray(parsed.uncertainty_reasons)
    ? parsed.uncertainty_reasons
    : Array.isArray(parsed.limitations)
    ? parsed.limitations
    : ['Surface polish and artificial lighting can obscure true timber color and cellular pore patterns'];

  const photoRecommendations: string[] = Array.isArray(parsed.photo_recommendations)
    ? parsed.photo_recommendations
    : parsed.additional_photos_recommended || !isImageSufficient
    ? [
        'Darwaze ke top ya bottom unpolished edge ki close-up photo lein jahan bina polish ke natural lakdi dikh sake.',
        'Daylight (natural roshni) mein bina flash ke wood grain ki 10cm doori se photo lein.',
      ]
    : [];

  return {
    wood_category: woodCategory,
    likely_wood_type: likelyWoodType,
    is_image_sufficient: isImageSufficient,
    confidence_level: confidenceLevel,
    visible_reasons: visibleReasons,
    visual_observations: visualObservations,
    visible_evidence: visibleEvidence,
    features_unassessed: featuresUnassessed,
    uncertainty_reasons: uncertaintyReasons,
    reasons_for_match: Array.isArray(parsed.reasons_for_match) ? parsed.reasons_for_match : visibleReasons,
    alternative_possibilities: Array.isArray(parsed.alternative_possibilities) ? parsed.alternative_possibilities : [],
    limitations: Array.isArray(parsed.limitations)
      ? parsed.limitations
      : ['Photo-based identification is an estimate. Laboratory/microscopic examination may be required for 100% confirmation.'],
    additional_photos_recommended: Boolean(parsed.additional_photos_recommended) || !isImageSufficient,
    photo_recommendations: photoRecommendations,
    customer_explanation:
      parsed.customer_explanation ||
      (woodCategory === 'Sagwan / Sagwani (Teak)'
        ? 'Uploaded photo ke ring-porous grain pattern aur natural features se yeh Sagwan (Teak Wood) lagti hai. Dhyan dein ki photo analysis ek visual estimate hai.'
        : woodCategory === 'Other Wood (Non-Teak)'
        ? `Photo ke grain aur structure se yeh Sagwan nahi balki ${likelyWoodType} ya doosri non-teak lakdi lagti hai.`
        : 'Photo saaf nahi hai ya polish ke karan lakdi ke natural pores dikh nahi rahe hain. Kripya bina polish ke edge ya daylight mein saaf grain photo upload karein.'),
    anti_false_sagwan_notice:
      parsed.anti_false_sagwan_notice ||
      'Dhyan Dein: Golden polish ya carving dekh kar turant Sagwan na maanein. Asli Sagwan mein earlywood pore rings aur natural oiliness hoti hai. Asliyat jaanchne ke liye unpolished edge ya sawmill certified stamp check karein.',
    comparison_notes: parsed.comparison_notes || {},
    disclaimer:
      'Yeh analysis camera photo par aadharit visual estimate hai. Yeh government laboratory ya botanical scientific test ka replacement nahi hai. Jai Hanuman Door ke sawmill experts se physical guidance ke liye WhatsApp karein.',
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Analyzes one or more door images using Gemini Vision model with deep botanical audit.
 */
export async function analyzeDoorWood(
  images: ImageInputPart[],
  options?: { adminContext?: boolean; isBenchmarkSpecimen?: boolean }
): Promise<AIWoodAnalysisResult> {
  if (!images || images.length === 0) {
    throw new Error('Analysis requires at least one image of the door');
  }

  // 1. Fetch available verified references from local database to ground analysis
  let verifiedReferences: WoodReferenceSample[] = [];
  try {
    verifiedReferences = getWoodReferences(true);
  } catch (err) {
    console.warn('Could not read verified wood references from db:', err);
  }

  const systemInstruction = buildTimberSpecialistInstruction(verifiedReferences);

  // 2. Prepare inline parts with descriptive role labels if provided
  const inlineParts: any[] = [];
  const imageDescriptions: string[] = [];

  images.forEach((img, idx) => {
    inlineParts.push({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType || 'image/jpeg',
      },
    });

    const roleName =
      img.role === 'full_door'
        ? 'Photo 1: Full Door View'
        : img.role === 'grain_closeup'
        ? `Photo ${idx + 1}: Close-up Grain & Pores`
        : img.role === 'unpolished_edge'
        ? `Photo ${idx + 1}: Unpolished / Unfinished Section (Bare Wood)`
        : img.role === 'end_grain'
        ? `Photo ${idx + 1}: End-Grain Cross Section (Growth Rings & Pores)`
        : `Photo ${idx + 1}: Door/Surface Angle`;

    imageDescriptions.push(roleName);
  });

  const ai = getGeminiClient();

  const userPrompt = `Here are ${images.length} photo(s) submitted for wood identification:
${imageDescriptions.map((d, i) => `- [Image ${i + 1}]: ${d}`).join('\n')}
${options?.isBenchmarkSpecimen ? `
NOTE FOR BENCHMARK / SPECIMEN EVALUATION:
This image is an isolated botanical timber reference diagram / anatomical specimen plate illustrating the exact visual and structural cellular markers of a specific timber category (e.g. ring-porous earlywood vessel bands, diffuse tyloses, interlocked fibrous grain, resin canal lines, natural heartwood streaks, cross-laminated plies, or blurry defocus).
Evaluate the timber species represented by these observable diagnostic features rather than rejecting the image as a diagram or non-photo.` : ''}

INSTRUCTIONS FOR MULTI-IMAGE ANALYSIS:
1. Examine the overall construction, joinery, and door surface in the full view.
2. Carefully inspect the close-up grain photo: observe the vessel pores (are they ring-porous like Sagwan, diffuse with tyloses like Sal, non-porous like Deodar/Pine, or printed like laminate?).
3. If an unpolished edge or end-grain photo is present, inspect the bare wood color, growth rings, and cross-sectional pore structure.
4. Evaluate whether the surface has been stained or coated in tinted PU polish to simulate Teak (Sagwan). Look for tell-tale signs: blotchy absorption in softer fibers, absence of genuine concentric earlywood pore bands, or interlocked fibrous texture beneath the color.
5. If the evidence is insufficient, blurry, or completely masked by opaque paint or heavy plastic laminate, do NOT guess. Set likely_wood_type to "Wood species could not be reliably identified from these photos." and confidence to "Low".
6. Provide your full multi-feature assessment in the exact JSON format specified.`;

  // Candidate models ordered for fastest latency (<5s), high throughput and reliable availability
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    let timer: any;
    try {
      console.log(`🤖 Invoking Gemini Vision model "${model}" with multi-feature timber methodology...`);

      const generatePromise = ai.models.generateContent({
        model,
        contents: [
          ...inlineParts,
          { text: userPrompt },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.15, // Very low temperature for strict objective botanical identification
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Model ${model} request exceeded 12s server timeout`));
        }, 12000);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timer);

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response received from AI model');
      }

      console.log(`✅ Gemini Vision model "${model}" responded successfully.`);
      return parseGeminiJsonResponse(responseText);
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      lastError = err;
      console.warn(`⚠️ Warning: Model ${model} failed for wood detection (${err.message || err}). Trying fallback...`);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  throw new Error(`AI Wood Detector could not process image: ${lastError?.message || 'High server demand'}`);
}
