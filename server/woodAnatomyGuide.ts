/**
 * Scientifically Grounded Botanical & Timber Anatomy Guide for Indian Timber Species
 * Used by Jai Hanuman Door AI Wood Detector for multi-feature visual identification.
 * 
 * Based on standard wood anatomical criteria (IAWA - International Association of Wood Anatomists,
 * Forest Research Institute Dehradun, and CIRAD Timber Database).
 */

export interface WoodSpeciesProfile {
  speciesName: string;
  botanicalName?: string;
  regionalNames: string[];
  porosityType:
    | 'Ring-porous'
    | 'Semi-ring-porous'
    | 'Diffuse-porous'
    | 'Ring-porous to Semi-ring-porous'
    | 'Diffuse-porous to Semi-ring-porous'
    | 'Ring-porous to Diffuse-porous'
    | 'Non-porous (Gymnosperm / Conifer)'
    | 'Engineered / Non-solid'
    | string;
  grainPattern: string;
  poreStructureAndTyloses: string;
  naturalColorHeartwood: string;
  naturalColorSapwood: string;
  textureAndTactility: string;
  growthRingsAndRays: string;
  commonImitationRisks: string[];
  distinguishingKeyFeatures: string[];
  whatCannotBeIdentifiedFromPhotoAlone: string[];
  hindiSummary: string;
}

export const WOOD_SPECIES_PROFILES: Record<string, WoodSpeciesProfile> = {
  'Sagwan (Teak)': {
    speciesName: 'Sagwan (Teak)',
    botanicalName: 'Tectona grandis',
    regionalNames: ['Sagwan', 'Saag', 'Teak', 'CP Teak', 'Burma Teak', 'Nilambur Teak'],
    porosityType: 'Ring-porous to Semi-ring-porous',
    grainPattern: 'Typically straight to mildly wavy longitudinal grain; occasional fluted or mottled figure in root cuts. Never coarse-interlocked like Sal.',
    poreStructureAndTyloses: 'Earlywood zone has conspicuous large pores forming distinct concentric single or double rows (ring-porous). Latewood pores are distinctly smaller, solitary or in radial multiples of 2-3. White or yellow crystalline deposits (tectoquinone/calcium phosphate) occasionally visible in vessels.',
    naturalColorHeartwood: 'Freshly cut: dull olive-green or yellowish-brown. On oxidation/light exposure: matures into rich warm golden-brown to dark golden, often with fine darker longitudinal shadow streaks.',
    naturalColorSapwood: 'Sharply demarcated pale yellowish-white to light grey sapwood, rarely used in premium door panels.',
    textureAndTactility: 'Coarse and distinctly uneven due to the transition between large earlywood and small latewood pores. Natural waxy/greasy natural tactile feel due to high extractive/oil content. Under natural light, exhibits a soft satiny luster rather than a plastic reflective shine.',
    growthRingsAndRays: 'Distinct annual growth rings marked by the band of large earlywood vessels. Fine rays visible under magnification.',
    commonImitationRisks: [
      'Jungle Wood or Sal stained with golden-brown or spirit polish to mimic Teak color.',
      'Printed laminate or PVC membrane with an artificial repeating "teakwood" grain.',
      'Thin 0.5mm teak face veneer pressed over cheap blockboard or plywood core.',
    ],
    distinguishingKeyFeatures: [
      'Concentric band of distinct large pores in earlywood (ring porosity).',
      'Straight to wavy grain with dark mineral/shadow lines (not chaotic fibrous interlock).',
      'Soft natural sheen with open vessel grooves (unless coated in thick opaque PU).',
      'Sapwood is distinctly lighter and separated, not blotchy.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Chemical extractive concentration and natural insect/termite resistance.',
      'Moisture content percentage and seasoning level (kiln-seasoned vs air-dried).',
      'True geographical provenance (e.g. distinguishing genuine CP Teak from imported Sudan/plantation teak often requires microscopic or isotopic test).',
    ],
    hindiSummary: 'Sagwan ki asli pehchan uske earlywood rings mein bade pores, seedhe ya lehradar grain, aur natural golden-brown rang se hoti hai. Polish ke neeche open pores aur oil-luster dikhta hai.',
  },

  'Saal (Sal)': {
    speciesName: 'Saal (Sal)',
    botanicalName: 'Shorea robusta',
    regionalNames: ['Saal', 'Sal', 'Sakhua', 'Sarai'],
    porosityType: 'Diffuse-porous',
    grainPattern: 'Heavily and distinctly interlocked fibrous grain. Spiral or twisted fiber alignment is very common, giving an intensely rough, tough appearance.',
    poreStructureAndTyloses: 'Diffuse-porous: pores are medium to large and scattered evenly throughout the growth ring. Heartwood pores are heavily plugged with glistening whitish tyloses. Characterized by tangential white lines formed by resin canals containing dammar resin.',
    naturalColorHeartwood: 'Fresh cut: light brown with pinkish cast. Quickly matures into deep reddish-brown or dark chocolate-brown on atmospheric exposure. Noticeably darker and redder than genuine Sagwan.',
    naturalColorSapwood: 'Pale yellowish-brown, distinct from the heartwood.',
    textureAndTactility: 'Very coarse, rough, fibrous, and splintery. Lacks the smooth, greasy natural oiliness of Sagwan. Extremely dense and heavy (approx. 880–1050 kg/m³ vs Teak ~650 kg/m³).',
    growthRingsAndRays: 'Growth rings indistinct or faintly defined by resin canal lines.',
    commonImitationRisks: [
      'Often stained light golden-brown to sell as "Teak frame / Sagwan Chaukhat".',
      'Due to high strength, commonly used for door frames (Chaukhat) where sellers might claim entire set is Sagwan.',
    ],
    distinguishingKeyFeatures: [
      'Diffuse pore arrangement (no concentric earlywood pore bands like Sagwan).',
      'Deeply interlocked fibrous grain with splintery texture.',
      'Whitish resin canal lines and heavily tylosed pores.',
      'Reddish-brown base undertone rather than olive-golden.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Exact structural density and dry weight (though fibrousness is visible).',
      'Internal heartwood checking or hidden resin pockets.',
    ],
    hindiSummary: 'Saal ka lakdi interlocked fibrous grain aur diffuse pores ke sath aati hai. Yeh Sagwan se zyada heavy aur laal-bhure rang ki hoti hai, jisme white resin lines aksar dikhti hain.',
  },

  'Sheesham': {
    speciesName: 'Sheesham',
    botanicalName: 'Dalbergia sissoo',
    regionalNames: ['Sheesham', 'Shisham', 'Tahli', 'Indian Rosewood', 'Sissoo'],
    porosityType: 'Diffuse-porous to Semi-ring-porous',
    grainPattern: 'Typically interlocked, wavy, or fiddleback figure with striking natural longitudinal streaks.',
    poreStructureAndTyloses: 'Medium to large pores scattered diffusely or occasionally concentrated in earlywood bands, surrounded by fine light-colored parenchyma bands. Pores often contain dark gum or glistening deposits.',
    naturalColorHeartwood: 'Rich golden-brown to deep purple-brown, blood-wood red, or dark chocolate with prominent deep purple-black streaks.',
    naturalColorSapwood: 'Striking high contrast: sapwood is crisp pale yellowish-white, providing a dramatic natural contrast against dark heartwood.',
    textureAndTactility: 'Medium to coarse texture with moderate natural luster. Very hard and heavy.',
    growthRingsAndRays: 'Growth rings distinct, marked by narrow marginal parenchyma bands.',
    commonImitationRisks: [
      'Stained Babool (Acacia) or dyed Mango wood stained with dark streaks to look like Sheesham.',
      'Sheesham veneer glued over MDF panels.',
    ],
    distinguishingKeyFeatures: [
      'Prominent dark brown to purple-black streaks running along the grain.',
      'Sharp contrast between dark heartwood and light sapwood.',
      'Fine parenchymal bands surrounding medium pores.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Degree of sapwood-to-heartwood ratio inside solid internal core.',
      'Vulnerability of sapwood portion to powder-post beetle attack without chemical treatment.',
    ],
    hindiSummary: 'Sheesham ki pehchan uski kaali-baingani streaks (dark stripes), golden-to-chocolate heartwood, aur safed sapwood ke natural contrast se hoti hai.',
  },

  'Jungle Wood': {
    speciesName: 'Jungle Wood',
    botanicalName: 'Mixed regional species (e.g. Babool, Eucalyptus, Rubberwood, Silver Oak, Albizia, Terminalia spp.)',
    regionalNames: ['Jungle Wood', 'Desi Wood', 'Country Wood', 'Mix Wood', 'Local Hardwood'],
    porosityType: 'Diffuse-porous',
    grainPattern: 'Heterogeneous and inconsistent. Varies from coarse stringy grain to dull, indistinct grain with frequent directional changes.',
    poreStructureAndTyloses: 'Inconsistent; pores may be sparsely scattered or randomly clustered without the structured ring-porous elegance of Teak or the consistent parenchyma of Rosewood.',
    naturalColorHeartwood: 'Highly variable: greyish-brown, pale straw, dull reddish-tan, or muddy brown with irregular blotchy patches.',
    naturalColorSapwood: 'Indistinct or uneven demarcation; often shows dark water marks or mineral discoloration.',
    textureAndTactility: 'Often dry, brittle, or chalky under the polish. Lacks natural waxy resin feel. Frequently stained with heavy pigmented tints.',
    growthRingsAndRays: 'Indistinct, irregular, or distorted.',
    commonImitationRisks: [
      'VERY COMMONLY stained with orange-brown, golden-yellow, or dark walnut PU/melamine polish to deceive buyers as "Teak / Sagwan".',
      'Sold under ambiguous names like "Redwood", "Hardwood", or "Country Teak".',
    ],
    distinguishingKeyFeatures: [
      'Absence of regular concentric earlywood pore rings found in true Teak.',
      'Blotchy artificial stain penetration where softer grain absorbs excess color.',
      'Inconsistent grain orientation and dull luster without oily depth.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'The exact botanical species among the dozens of local tree varieties.',
      'Susceptibility to termite infestation or warp without chemical dipping.',
    ],
    hindiSummary: '"Jungle Wood" koi ek botanical lakdi nahi hai, yeh alag-alag local lakdiyon ka mix trade term hai. Isme aksar Teak jaisa rang lane ke liye artificial polish/stain lagaya jata hai.',
  },

  'Deodar': {
    speciesName: 'Deodar',
    botanicalName: 'Cedrus deodara',
    regionalNames: ['Deodar', 'Devdar', 'Himalayan Cedar'],
    porosityType: 'Non-porous (Gymnosperm / Conifer)',
    grainPattern: 'Exceptionally straight, fine, and uniform. Free of vessel pores because it is a conifer (softwood).',
    poreStructureAndTyloses: 'No vessel pores! Tracheid structure produces a very clean, fine-textured surface with prominent annual growth rings.',
    naturalColorHeartwood: 'Light yellowish-brown to golden-tan, darkening slightly with age.',
    naturalColorSapwood: 'Narrow white to creamy-yellow sapwood.',
    textureAndTactility: 'Fine, even texture with a distinctive oily touch and strong natural cedar aroma. Lightweight compared to Sal and Sheesham.',
    growthRingsAndRays: 'Conspicuous, sharp annual growth ring boundaries formed by the transition between soft earlywood and dense latewood tracheids.',
    commonImitationRisks: [
      'Cheaper pine or fir stained yellow and sold as Deodar.',
    ],
    distinguishingKeyFeatures: [
      'Complete absence of vessel pores (pores cannot be found even with a magnifying lens).',
      'Sharp, clean, parallel annual growth lines.',
      'Uniform yellowish-tan hue without dark pore grooves.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Characteristic aromatic cedar fragrance (requires physical scent check).',
    ],
    hindiSummary: 'Deodar ek softwood conifer hai jisme vessel pores nahi hote. Iska grain bilkul seedha aur fine hota hai jisme annual growth rings saaf dikhti hain.',
  },

  'Mango Wood': {
    speciesName: 'Mango Wood',
    botanicalName: 'Mangifera indica',
    regionalNames: ['Aam ki lakdi', 'Mango Wood'],
    porosityType: 'Diffuse-porous',
    grainPattern: 'Curly, straight, or interlocked; often exhibits attractive natural spalting, quilting, or fiddleback figure.',
    poreStructureAndTyloses: 'Medium to large solitary pores and short radial multiples scattered evenly; tyloses moderately present.',
    naturalColorHeartwood: 'Light brown to golden-brown, characteristically patterned with natural streaks of pink, green, yellow, grey, and black caused by fungi/mineralization (spalting).',
    naturalColorSapwood: 'Light cream to yellowish-brown, moderately distinct.',
    textureAndTactility: 'Medium to coarse texture with moderate natural luster. Moderately light and soft compared to Teak.',
    growthRingsAndRays: 'Faint or indistinct.',
    commonImitationRisks: [
      'Stained with dark mahogany or walnut polish to resemble Sheesham or Teak.',
    ],
    distinguishingKeyFeatures: [
      'Characteristic multicolored spalting streaks (grey, green, pink hints in natural wood).',
      'Medium diffuse pores without ring-porous bands.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Chemical treatment against wood-borer beetles.',
    ],
    hindiSummary: 'Aam ki lakdi mein natural pink, green ya grey mineral streaks hoti hain aur pores diffuse hote hain.',
  },

  'Neem': {
    speciesName: 'Neem',
    botanicalName: 'Azadirachta indica',
    regionalNames: ['Neem', 'Nimba', 'Indian Lilac'],
    porosityType: 'Ring-porous to Diffuse-porous',
    grainPattern: 'Interlocking grain, sometimes slightly wavy.',
    poreStructureAndTyloses: 'Medium pores, earlywood pores larger; vessels filled with reddish-brown gummy deposits.',
    naturalColorHeartwood: 'Reddish-brown to deep brick red, resembling mahogany. Darkens significantly with exposure.',
    naturalColorSapwood: 'Greyish-white to pale yellowish-cream.',
    textureAndTactility: 'Medium to coarse, slightly fibrous feel with moderate luster.',
    growthRingsAndRays: 'Distinct growth rings.',
    commonImitationRisks: [
      'Sold as "Indian Mahogany" or stained to look like Teak.',
    ],
    distinguishingKeyFeatures: [
      'Reddish-brick heartwood with reddish gum deposits in vessel cavities.',
      'Interlocking grain with moderate ring porosity.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Bitter taste/smell inherent to neem extractives.',
    ],
    hindiSummary: 'Neem ka heartwood laal-bhura (reddish-brown) hota hai aur pores mein laal gum bhara hota hai.',
  },

  'Pine': {
    speciesName: 'Pine',
    botanicalName: 'Pinus roxburghii / Pinus wallichiana',
    regionalNames: ['Chir Pine', 'Kail', 'Pine Wood', 'Pinewood'],
    porosityType: 'Non-porous (Gymnosperm / Conifer)',
    grainPattern: 'Straight grain with pronounced transition bands between earlywood and latewood. Frequent round dark knots.',
    poreStructureAndTyloses: 'No vessel pores! Large conspicuous resin canals visible as fine longitudinal brownish lines.',
    naturalColorHeartwood: 'Pale creamy-yellow to light reddish-yellow.',
    naturalColorSapwood: 'Pale creamy-white.',
    textureAndTactility: 'Soft, light to medium density, distinct resinous sheen. Low dimensional stability in humid conditions.',
    growthRingsAndRays: 'Extremely conspicuous annual growth rings with dark, dense latewood bands.',
    commonImitationRisks: [
      'Pine doors stained dark to pass off as solid hardwood doors.',
    ],
    distinguishingKeyFeatures: [
      'No pores; prominent dark round knots.',
      'Broad soft earlywood and hard latewood ring bands.',
      'Noticeably pale base color.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Internal sapwood moisture content and glue bond strength in finger-jointed pine.',
    ],
    hindiSummary: 'Pine mein koi vessel pores nahi hote, round knots aur broad growth rings saaf dikhti hain.',
  },

  'Plywood': {
    speciesName: 'Plywood',
    botanicalName: 'Engineered cross-laminated veneer panels',
    regionalNames: ['Plywood', 'Ply', 'Marine Ply', 'Commercial Ply', 'Blockboard'],
    porosityType: 'Engineered / Non-solid',
    grainPattern: 'Varies based on face veneer; typically rotary peeled grain with sweeping arches or flat uniform appearance.',
    poreStructureAndTyloses: 'End edges show alternating 90-degree dark and light veneer glue lines (multi-layer sandwich). Face veneer is typically 0.3mm to 1.0mm thick.',
    naturalColorHeartwood: 'Determined by surface veneer face, not representative of core.',
    naturalColorSapwood: 'N/A',
    textureAndTactility: 'Extremely flat and smooth surface; edges reveal distinct ply layers or core wooden battens (in blockboard).',
    growthRingsAndRays: 'End grain does not show circular growth rings; instead shows horizontal parallel plies.',
    commonImitationRisks: [
      'Plywood door with teak veneer sold as "Solid Sagwan Door".',
    ],
    distinguishingKeyFeatures: [
      'Visible edge plies (sandwich lines) at top/bottom or hinge cutouts.',
      'Perfect surface flatness without natural wood seasonal cupping.',
      'Edge banding tape or veneer peeling at corners.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Internal core glue grade (MR vs BWR vs BWP/Marine IS:710).',
    ],
    hindiSummary: 'Plywood ke edges par layers (sandwich plies) dikhti hain. Yeh solid lakdi nahi hoti balki thin sheets ko glue karke banayi jaati hai.',
  },

  'Veneered Wood': {
    speciesName: 'Veneered Wood',
    botanicalName: 'Decorative natural timber sliced veneer over engineered core',
    regionalNames: ['Veneer Door', 'Natural Veneer', 'Teak Veneer', 'Burma Teak Veneer'],
    porosityType: 'Engineered / Non-solid',
    grainPattern: 'Symmetrical repeating grain patterns created by bookmatching, slipmatching, or reverse diamond matching.',
    poreStructureAndTyloses: 'Surface shows genuine timber pores (e.g. genuine Teak or Rosewood slice), but depth of pore structure is micro-thin (0.5mm - 1.5mm).',
    naturalColorHeartwood: 'High aesthetic color of the selected veneer face.',
    naturalColorSapwood: 'N/A',
    textureAndTactility: 'Natural wood grain feel, but door edges feature edge-banding strips or veneer seams along vertical joinery.',
    growthRingsAndRays: 'No natural end-grain growth rings on top or bottom door edges.',
    commonImitationRisks: [
      'Veneered flush doors frequently sold to unsuspecting buyers as "Solid Burma Teak Doors".',
    ],
    distinguishingKeyFeatures: [
      'Repeating symmetrical pattern seams (bookmatched mirror reflection lines).',
      'Edge banding strip glued to cover core edges.',
      'Absence of natural end-grain growth rings on top/bottom edge.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Core material behind the 1mm veneer (plywood, MDF, particleboard, or tubular core).',
    ],
    hindiSummary: 'Veneer door par 0.5mm se 1.5mm ki asli lakdi ki thin sheet chipkai hoti hai. Isme repeating mirror-matched patterns aur edge-banding strips dikhti hain.',
  },

  'Laminated or engineered wood': {
    speciesName: 'Laminated or engineered wood',
    botanicalName: 'HPL / Melamine / PVC Membrane / Digital printed foil over engineered core',
    regionalNames: ['Laminate Door', 'Sunmica Door', 'Membrane Door', 'MDF Door', 'WPC Door'],
    porosityType: 'Engineered / Non-solid',
    grainPattern: 'Photographically printed wood pattern. Perfect repeating visual motifs without organic natural timber imperfections.',
    poreStructureAndTyloses: 'Artificial embossed micro-texture or completely smooth plastic sheen. Pores do not have botanical cellular depth.',
    naturalColorHeartwood: 'Synthetic printed color.',
    naturalColorSapwood: 'N/A',
    textureAndTactility: 'Cold plastic or synthetic feel. Scratch-resistant resin finish. Light reflection reveals perfectly flat mirror or embossed plastic texture.',
    growthRingsAndRays: 'Completely absent.',
    commonImitationRisks: [
      'Marketed under trade names like "Digital Teak" or "3D Sagwan Finish".',
    ],
    distinguishingKeyFeatures: [
      'Microscopic print dots or digitally repeating grain identical on multiple panels.',
      'Sharp PVC edge banding or seamless wrapped membrane foil.',
      'Zero cellular wood pore depth.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Core substrate density (MDF vs HDF vs Particleboard).',
    ],
    hindiSummary: 'Laminate ya engineered door par lakdi ka photo print (Sunmica ya PVC) chipkaya hota hai. Isme natural pores aur rings nahi hoti.',
  },

  'Other / Unknown': {
    speciesName: 'Other / Unknown',
    regionalNames: ['Unidentified Timber', 'Opaque Coated', 'Heavily Painted'],
    porosityType: 'Diffuse-porous',
    grainPattern: 'Concealed by opaque paint, extreme stain, synthetic wrap, or heavy degradation.',
    poreStructureAndTyloses: 'Obscured or invisible from provided camera angles/resolution.',
    naturalColorHeartwood: 'Masked by surface treatment.',
    naturalColorSapwood: 'Masked.',
    textureAndTactility: 'Varies.',
    growthRingsAndRays: 'Inconclusive.',
    commonImitationRisks: [
      'Old reclaimed timbers coated in multiple coats of enamel paint.',
    ],
    distinguishingKeyFeatures: [
      'Insufficient visual timber markers visible to make a responsible identification.',
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      'Species cannot be determined without scraping a section down to bare raw wood.',
    ],
    hindiSummary: 'Photo mein paint, dark polish ya blur hone ki wajah se lakdi ke natural grain aur pores saaf nahi dikh rahe hain.',
  },
};
