import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Door, CustomDoorFittingState, WoodColorTone } from '../types.ts';

// Color hex mappings for wood tones
export const WOOD_COLOR_HEX_MAP: Record<WoodColorTone, number> = {
  natural_teak: 0xc9873c,
  light_teak: 0xdca864,
  golden_teak: 0xb56924,
  dark_teak: 0x6e3b18,
  walnut: 0x482a1a,
  rosewood: 0x5a1f1b,
  custom: 0xb56924,
};

export const getWoodToneTint = (tone: WoodColorTone, customHex?: string): number => {
  if (customHex) {
    try {
      return parseInt(customHex.replace('#', '0x'), 16);
    } catch {}
  }
  switch (tone) {
    case 'natural_teak':
      return 0xffffff;
    case 'light_teak':
      return 0xfff4e6;
    case 'golden_teak':
      return 0xffe2bf;
    case 'dark_teak':
      return 0xd5b090;
    case 'walnut':
      return 0xbf9e8a;
    case 'rosewood':
      return 0xc79191;
    default:
      return 0xffffff;
  }
};

export interface PolishQuality {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export const POLISH_QUALITY_MAP: Record<string, PolishQuality> = {
  'PU Polish (Polyurethane)': { roughness: 0.12, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.1 },
  'Melamine Polish': { roughness: 0.22, metalness: 0.04, clearcoat: 0.4, clearcoatRoughness: 0.2 },
  'Teak Polish': { roughness: 0.38, metalness: 0.02, clearcoat: 0.15, clearcoatRoughness: 0.3 },
  'Normal Polish': { roughness: 0.55, metalness: 0.01 },
  'Unpolished / Raw': { roughness: 0.75, metalness: 0.0 },
};

export interface BuildDoorOptions {
  door: Door;
  fittingState: CustomDoorFittingState;
  doorW: number; // width in meters
  doorH: number; // height in meters
  doorThick: number; // thickness in meters
  hasFrame: boolean;
  frameW: number;
  frameDepth: number;
  onTextureLoaded?: () => void;
}

export interface BuiltDoorResult {
  rootGroup: THREE.Group;
  leafPivot: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  isCadModel: boolean;
}

/**
 * Builds a realistic 3D architectural door with Chaukhat frame,
 * solid door slab, 3D trims, hardware, and hinge pivot group.
 */
export function buildArchitectural3DDoor(
  root: THREE.Group,
  options: BuildDoorOptions
): BuiltDoorResult {
  const { door, fittingState, doorW, doorH, doorThick, hasFrame, frameW, frameDepth, onTextureLoaded } = options;
  const materials: THREE.MeshStandardMaterial[] = [];

  // 1. Clear existing children
  while (root.children.length > 0) {
    const child = root.children[0];
    root.remove(child);
  }

  // 2. Resolve color and polish properties
  const resolvedColor = fittingState.customHexColor
    ? parseInt(fittingState.customHexColor.replace('#', '0x'), 16)
    : WOOD_COLOR_HEX_MAP[fittingState.colorTone] || 0xc9873c;

  const polishProps = POLISH_QUALITY_MAP[fittingState.finishName] || { roughness: 0.35, metalness: 0.02 };

  // Primary wood material for edges, stiles, rails, and back
  const woodMat = new THREE.MeshStandardMaterial({
    color: resolvedColor,
    roughness: polishProps.roughness,
    metalness: polishProps.metalness,
    bumpScale: 0.003,
  });
  materials.push(woodMat);

  // 3. Build Chaukhat (Door Frame) with 3D Depth
  if (hasFrame) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(resolvedColor).multiplyScalar(0.92), // Rich seasoned frame tone
      roughness: Math.min(1.0, polishProps.roughness + 0.1),
      metalness: 0.01,
    });
    materials.push(frameMat);

    // Left Jamb
    const leftJambGeo = new THREE.BoxGeometry(frameW, doorH + frameW, frameDepth);
    const leftJamb = new THREE.Mesh(leftJambGeo, frameMat);
    leftJamb.position.set(-doorW / 2 - frameW / 2, (doorH + frameW) / 2, 0);
    leftJamb.castShadow = true;
    leftJamb.receiveShadow = true;
    root.add(leftJamb);

    // Right Jamb
    const rightJambGeo = new THREE.BoxGeometry(frameW, doorH + frameW, frameDepth);
    const rightJamb = new THREE.Mesh(rightJambGeo, frameMat);
    rightJamb.position.set(doorW / 2 + frameW / 2, (doorH + frameW) / 2, 0);
    rightJamb.castShadow = true;
    rightJamb.receiveShadow = true;
    root.add(rightJamb);

    // Top Header
    const headerGeo = new THREE.BoxGeometry(doorW + frameW * 2, frameW, frameDepth);
    const header = new THREE.Mesh(headerGeo, frameMat);
    header.position.set(0, doorH + frameW / 2, 0);
    header.castShadow = true;
    header.receiveShadow = true;
    root.add(header);
  }

  // 4. Door Leaf Hinge Pivot Group (Rotates along left side hinge)
  const leafPivot = new THREE.Group();
  leafPivot.position.set(-doorW / 2, 0, 0); // Pivot located at left hinge axis
  root.add(leafPivot);

  // Apply initial open angle
  const initialRad = ((fittingState.doorOpenAngle || 0) * Math.PI) / 180;
  leafPivot.rotation.y = initialRad;

  // Door Leaf Mesh Group (offset by +doorW / 2 so origin is at left edge)
  const leafMeshGroup = new THREE.Group();
  leafMeshGroup.position.set(doorW / 2, 0, 0);
  leafPivot.add(leafMeshGroup);

  // 5. Front Face Material with Exact Selected Catalogue Door Image / Carving
  const textureUrl = door.model3d?.textureUrl || (door.images && door.images[0]) || '';
  const woodToneTint = getWoodToneTint(fittingState.colorTone, fittingState.customHexColor);

  const frontMat = new THREE.MeshStandardMaterial({
    color: woodToneTint,
    roughness: polishProps.roughness,
    metalness: polishProps.metalness,
    bumpScale: 0.002,
  });
  materials.push(frontMat);

  if (textureUrl) {
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      textureUrl,
      tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        frontMat.map = tex;
        frontMat.needsUpdate = true;
        if (onTextureLoaded) onTextureLoaded();
      },
      undefined,
      () => {
        // Fallback to solid wood tone if texture fails
      }
    );
  }

  // 6. Solid Architectural Door Leaf Slab (w x h x thickness)
  // Multi-material cube: [right, left, top, bottom, FRONT, back]
  const leafGeo = new THREE.BoxGeometry(doorW, doorH, doorThick);
  const leafMesh = new THREE.Mesh(leafGeo, [
    woodMat,  // right edge
    woodMat,  // left edge
    woodMat,  // top edge
    woodMat,  // bottom edge
    frontMat, // FRONT FACE: Entire Catalogue Door Image & Carving
    woodMat,  // back face
  ]);
  leafMesh.position.set(0, doorH / 2, 0);
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  leafMeshGroup.add(leafMesh);

  // 7. 3D Architectural Perimeter Chamfer Trim (Slim 1.6cm bevel for realistic 3D depth)
  const trimW = 0.016;
  const trimMat = woodMat;

  // Left trim
  const lTrimGeo = new THREE.BoxGeometry(trimW, doorH, doorThick * 0.1);
  const lTrim = new THREE.Mesh(lTrimGeo, trimMat);
  lTrim.position.set(-doorW / 2 + trimW / 2, doorH / 2, doorThick / 2 + doorThick * 0.05);
  leafMeshGroup.add(lTrim);

  // Right trim
  const rTrimGeo = new THREE.BoxGeometry(trimW, doorH, doorThick * 0.1);
  const rTrim = new THREE.Mesh(rTrimGeo, trimMat);
  rTrim.position.set(doorW / 2 - trimW / 2, doorH / 2, doorThick / 2 + doorThick * 0.05);
  leafMeshGroup.add(rTrim);

  // Top trim
  const tTrimGeo = new THREE.BoxGeometry(doorW, trimW, doorThick * 0.1);
  const tTrim = new THREE.Mesh(tTrimGeo, trimMat);
  tTrim.position.set(0, doorH - trimW / 2, doorThick / 2 + doorThick * 0.05);
  leafMeshGroup.add(tTrim);

  // Bottom trim
  const bTrimGeo = new THREE.BoxGeometry(doorW, trimW, doorThick * 0.1);
  const bTrim = new THREE.Mesh(bTrimGeo, trimMat);
  bTrim.position.set(0, trimW / 2, doorThick / 2 + doorThick * 0.05);
  leafMeshGroup.add(bTrim);

  // 8. Genuine 3D Brass / Steel Hardware
  const isBrass = fittingState.handleStyle !== 'steel_modern' && fittingState.handleStyle !== 'minimal_black';
  const metalColor = isBrass ? 0xd4af37 : fittingState.handleStyle === 'minimal_black' ? 0x222222 : 0xcccccc;
  const metalMat = new THREE.MeshStandardMaterial({
    color: metalColor,
    metalness: 0.92,
    roughness: isBrass ? 0.22 : 0.35,
  });

  const hardwareX = doorW / 2 - 0.055; // Position on right lock stile
  const hardwareY = doorH * 0.48; // Ergonomic height

  // 3D Door Pull Handle
  const handleBaseGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 16);
  const handleMesh = new THREE.Mesh(handleBaseGeo, metalMat);
  handleMesh.position.set(hardwareX, hardwareY, doorThick / 2 + 0.045);
  handleMesh.castShadow = true;
  leafMeshGroup.add(handleMesh);

  // Handle Standoff Posts
  const postGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12);
  const postTop = new THREE.Mesh(postGeo, metalMat);
  postTop.rotation.x = Math.PI / 2;
  postTop.position.set(hardwareX, hardwareY + 0.09, doorThick / 2 + 0.022);
  leafMeshGroup.add(postTop);

  const postBottom = new THREE.Mesh(postGeo, metalMat);
  postBottom.rotation.x = Math.PI / 2;
  postBottom.position.set(hardwareX, hardwareY - 0.09, doorThick / 2 + 0.022);
  leafMeshGroup.add(postBottom);

  // Traditional Indian Aldrop (Horizontal security latch)
  if (fittingState.hardwareName.toLowerCase().includes('aldrop') || isBrass) {
    const aldropBarGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.22, 16);
    const aldropBar = new THREE.Mesh(aldropBarGeo, metalMat);
    aldropBar.rotation.z = Math.PI / 2;
    aldropBar.position.set(hardwareX - 0.02, hardwareY + 0.20, doorThick / 2 + 0.02);
    aldropBar.castShadow = true;
    leafMeshGroup.add(aldropBar);

    const bracketGeo = new THREE.BoxGeometry(0.025, 0.03, 0.02);
    const b1 = new THREE.Mesh(bracketGeo, metalMat);
    b1.position.set(hardwareX - 0.08, hardwareY + 0.20, doorThick / 2 + 0.01);
    leafMeshGroup.add(b1);

    const b2 = new THREE.Mesh(bracketGeo, metalMat);
    b2.position.set(hardwareX + 0.04, hardwareY + 0.20, doorThick / 2 + 0.01);
    leafMeshGroup.add(b2);
  }

  // 3D Hinges on Left Edge
  const hingeMat = new THREE.MeshStandardMaterial({
    color: isBrass ? 0xb8860b : 0x777777,
    metalness: 0.85,
    roughness: 0.3,
  });
  const hingePositions = [doorH * 0.18, doorH * 0.5, doorH * 0.82];
  hingePositions.forEach(posY => {
    const hingeGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.08, 12);
    const hingeMesh = new THREE.Mesh(hingeGeo, hingeMat);
    hingeMesh.position.set(-doorW / 2 + 0.002, posY, 0);
    hingeMesh.castShadow = true;
    leafMeshGroup.add(hingeMesh);
  });

  return {
    rootGroup: root,
    leafPivot,
    materials,
    isCadModel: false,
  };
}
