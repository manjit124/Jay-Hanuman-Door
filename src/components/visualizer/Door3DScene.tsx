import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { Door, CustomDoorFittingState, WoodColorTone, DoorDesignStyle } from '../../types.ts';
import { resolveImageUrl } from '../../lib/api.ts';

export interface Door3DSceneHandle {
  captureCanvasImage: () => string | null;
  resetView: () => void;
  rotateHorizontal: (direction: 'left' | 'right') => void;
  rotateVertical: (direction: 'up' | 'down') => void;
  zoom: (direction: 'in' | 'out') => void;
}

interface Door3DSceneProps {
  door: Door;
  fittingState: CustomDoorFittingState;
  onOpenAngleChange?: (angle: number) => void;
  className?: string;
  showControls?: boolean;
}

// Color hex mappings for subtle wood tone tinting (preserves carving contrast)
export const isDoorDoubleDoor = (door?: Door | null, isExplicitDouble?: boolean): boolean => {
  if (isExplicitDouble) return true;
  if (!door) return false;
  const cat = (door.category || '').toLowerCase();
  const name = (door.name || '').toLowerCase();
  const desc = (door.description || '').toLowerCase();
  const mat = (door.material || '').toLowerCase();

  return (
    cat.includes('double') ||
    cat.includes('2 door') ||
    cat.includes('2-door') ||
    cat.includes('2 leaf') ||
    cat.includes('2-leaf') ||
    name.includes('double') ||
    name.includes('2 door') ||
    name.includes('2-door') ||
    name.includes('2 leaf') ||
    name.includes('2-leaf') ||
    desc.includes('double door') ||
    desc.includes('double shutter') ||
    desc.includes('2-leaf') ||
    desc.includes('2 leaf') ||
    mat.includes('double')
  );
};

const getWoodToneTint = (tone: WoodColorTone, customHex?: string): number => {
  if (customHex) {
    try {
      return parseInt(customHex.replace('#', '0x'), 16);
    } catch {}
  }
  switch (tone) {
    case 'natural_teak':
      return 0xffffff; // Pristine natural catalogue photo colors
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

const WOOD_COLOR_HEX_MAP: Record<WoodColorTone, number> = {
  natural_teak: 0xc9873c,
  light_teak: 0xdca864,
  golden_teak: 0xb56924,
  dark_teak: 0x6e3b18,
  walnut: 0x482a1a,
  rosewood: 0x5a1f1b,
  custom: 0xb56924,
};

// Polish surface qualities
interface PolishQuality {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

const POLISH_QUALITY_MAP: Record<string, PolishQuality> = {
  'PU Polish (Polyurethane)': { roughness: 0.12, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.1 },
  'Melamine Polish': { roughness: 0.22, metalness: 0.04, clearcoat: 0.4, clearcoatRoughness: 0.2 },
  'Teak Polish': { roughness: 0.38, metalness: 0.02, clearcoat: 0.15, clearcoatRoughness: 0.3 },
  'Normal Polish': { roughness: 0.55, metalness: 0.01 },
  'Unpolished / Raw': { roughness: 0.75, metalness: 0.0 },
};

export const Door3DScene = forwardRef<Door3DSceneHandle, Door3DSceneProps>(({
  door,
  fittingState,
  onOpenAngleChange,
  className = '',
  showControls = true,
}, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const doorPivotGroupRef = useRef<THREE.Group | null>(null);
  const doorLeafGroupRef = useRef<THREE.Group | null>(null);
  const leftDoorLeafRef = useRef<THREE.Group | null>(null);
  const rightDoorLeafRef = useRef<THREE.Group | null>(null);
  const isDoubleDoorRef = useRef<boolean>(false);
  const doorMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<boolean>(false);
  const [modelType, setModelType] = useState<'cad' | 'procedural'>('procedural');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode2D, setViewMode2D] = useState(false);

  // 1. Initialize Scene & Renderer
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLError('WebGL is not supported or disabled in this browser.');
        return;
      }
    } catch {
      setWebGLError('Could not initialize 3D graphics hardware.');
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8F8F6); // Premium light studio showroom background
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.05, 3.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // Needed for screenshot captures
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // Clamped for mobile battery efficiency
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;

    // Clean container before appending
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.0, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = 6.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent camera from dipping too far below floor
    controlsRef.current = controls;

    // Lighting Setup
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffeedb, 0.9);
    scene.add(ambientLight);

    // Key Light (warm showroom spot)
    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.6);
    keyLight.position.set(2.5, 4.0, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Soft Fill Light (cool fill)
    const fillLight = new THREE.DirectionalLight(0xd9e5ff, 0.7);
    fillLight.position.set(-3.0, 2.5, 2.0);
    scene.add(fillLight);

    // Rim/Back Light (highlights wooden bevels & brass edges)
    const rimLight = new THREE.DirectionalLight(0xffd8a8, 0.9);
    rimLight.position.set(0, 3.5, -2.5);
    scene.add(rimLight);

    // Ground Floor Plane (catches contact shadows)
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle showroom pedestal ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.001;
    scene.add(ringMesh);

    // Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      controls.dispose();
      renderer.dispose();
      // Dispose materials & geometries
      scene.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Build or Reload 3D Door Geometry & Materials when Door or Customizations change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing door hierarchy
    if (doorPivotGroupRef.current) {
      scene.remove(doorPivotGroupRef.current);
      doorPivotGroupRef.current.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
        }
      });
      doorPivotGroupRef.current = null;
    }

    doorLeafGroupRef.current = null;
    leftDoorLeafRef.current = null;
    rightDoorLeafRef.current = null;
    doorMaterialsRef.current = [];

    // Scale units: inches to meters (1 inch = 0.0254m)
    const INCH_TO_M = 0.0254;
    const doorW = (fittingState.widthInch || 36) * INCH_TO_M;
    const doorH = (fittingState.heightInch || 78) * INCH_TO_M;
    const doorThick = (fittingState.thicknessInch || 1.5) * INCH_TO_M;

    // Check if double door
    const isDouble = isDoorDoubleDoor(door, fittingState.isDoubleDoor);
    isDoubleDoorRef.current = isDouble;

    // Frame (Chaukhat)
    const hasFrame = !fittingState.frameName.toLowerCase().includes('without') && !fittingState.frameName.toLowerCase().includes('none');
    const frameW = (door.model3d?.frameWidthInch || 4) * INCH_TO_M;
    const frameDepth = (door.model3d?.frameDepthInch || 2.75) * INCH_TO_M;

    // Base Group
    const rootDoorGroup = new THREE.Group();
    rootDoorGroup.name = 'rootDoorGroup';
    doorPivotGroupRef.current = rootDoorGroup;
    scene.add(rootDoorGroup);

    // Check if custom GLB 3D model is provided
    const customModelUrl = door.model3d?.modelUrl;
    if (customModelUrl && customModelUrl.endsWith('.glb')) {
      setLoadingModel(true);
      setModelType('cad');
      const loader = new GLTFLoader();
      loader.load(
        resolveImageUrl(customModelUrl),
        gltf => {
          setLoadingModel(false);
          const model = gltf.scene;
          model.traverse(node => {
            if ((node as THREE.Mesh).isMesh) {
              const mesh = node as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          // Auto scale to fit requested dimensions
          const bbox = new THREE.Box3().setFromObject(model);
          const size = bbox.getSize(new THREE.Vector3());
          if (size.y > 0) {
            const scaleFactor = doorH / size.y;
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }
          model.position.set(0, 0, 0);

          // Check if GLB model has pre-split leaf nodes
          let foundLeftNode: THREE.Object3D | null = null;
          let foundRightNode: THREE.Object3D | null = null;
          model.traverse(node => {
            const n = node.name.toLowerCase();
            if (n.includes('left') && (n.includes('leaf') || n.includes('door') || n.includes('shutter'))) {
              foundLeftNode = node;
            }
            if (n.includes('right') && (n.includes('leaf') || n.includes('door') || n.includes('shutter'))) {
              foundRightNode = node;
            }
          });

          if (isDouble && foundLeftNode && foundRightNode) {
            leftDoorLeafRef.current = foundLeftNode as THREE.Group;
            rightDoorLeafRef.current = foundRightNode as THREE.Group;
          } else {
            doorLeafGroupRef.current = model as THREE.Group;
          }

          rootDoorGroup.add(model);
        },
        undefined,
        err => {
          console.warn('Failed to load custom GLB model, falling back to procedural architectural door:', err);
          setLoadingModel(false);
          setModelType('procedural');
          buildProceduralDoor(rootDoorGroup, doorW, doorH, doorThick, hasFrame, frameW, frameDepth, isDouble);
        }
      );
    } else {
      setModelType('procedural');
      buildProceduralDoor(rootDoorGroup, doorW, doorH, doorThick, hasFrame, frameW, frameDepth, isDouble);
    }
  }, [
    door.id,
    door.images,
    door.model3d?.modelUrl,
    door.model3d?.textureUrl,
    fittingState.widthInch,
    fittingState.heightInch,
    fittingState.thicknessInch,
    fittingState.isDoubleDoor,
    fittingState.frameId,
    fittingState.frameName,
    fittingState.handleStyle,
    fittingState.designStyle,
  ]);

  // Procedural 3D Architectural Door Builder
  const buildProceduralDoor = (
    root: THREE.Group,
    w: number,
    h: number,
    thickness: number,
    hasFrame: boolean,
    frameW: number,
    frameDepth: number,
    isDouble: boolean
  ) => {
    // Determine color & polish
    const resolvedColor = fittingState.customHexColor
      ? parseInt(fittingState.customHexColor.replace('#', '0x'), 16)
      : WOOD_COLOR_HEX_MAP[fittingState.colorTone] || 0xc9873c;

    const polishProps = POLISH_QUALITY_MAP[fittingState.finishName] || { roughness: 0.35, metalness: 0.02 };

    // Primary Wood Material (used for stiles, rails, frames, trims)
    const woodMat = new THREE.MeshStandardMaterial({
      color: resolvedColor,
      roughness: polishProps.roughness,
      metalness: polishProps.metalness,
      bumpScale: 0.003,
    });
    doorMaterialsRef.current.push(woodMat);

    // Frame (Chaukhat) construction
    if (hasFrame) {
      const frameMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(resolvedColor).multiplyScalar(0.92), // Slightly deeper tone for aged chaukhat
        roughness: Math.min(1.0, polishProps.roughness + 0.1),
        metalness: 0.01,
      });
      doorMaterialsRef.current.push(frameMat);

      // Left Jamb
      const leftJambGeo = new THREE.BoxGeometry(frameW, h + frameW, frameDepth);
      const leftJamb = new THREE.Mesh(leftJambGeo, frameMat);
      leftJamb.position.set(-w / 2 - frameW / 2, (h + frameW) / 2, 0);
      leftJamb.castShadow = true;
      leftJamb.receiveShadow = true;
      root.add(leftJamb);

      // Right Jamb
      const rightJambGeo = new THREE.BoxGeometry(frameW, h + frameW, frameDepth);
      const rightJamb = new THREE.Mesh(rightJambGeo, frameMat);
      rightJamb.position.set(w / 2 + frameW / 2, (h + frameW) / 2, 0);
      rightJamb.castShadow = true;
      rightJamb.receiveShadow = true;
      root.add(rightJamb);

      // Top Header
      const headerGeo = new THREE.BoxGeometry(w + frameW * 2, frameW, frameDepth);
      const header = new THREE.Mesh(headerGeo, frameMat);
      header.position.set(0, h + frameW / 2, 0);
      header.castShadow = true;
      header.receiveShadow = true;
      root.add(header);
    }

    // Front Face Material with Exact Selected Catalogue Door Image
    const rawTexture = door.model3d?.textureUrl || door.image || (door.images && door.images[0]) || '';
    const textureUrl = rawTexture ? resolveImageUrl(rawTexture) : '';
    const woodToneTint = getWoodToneTint(fittingState.colorTone, fittingState.customHexColor);

    const frontMat = new THREE.MeshStandardMaterial({
      color: woodToneTint,
      roughness: polishProps.roughness,
      metalness: polishProps.metalness,
      bumpScale: 0.002,
    });
    doorMaterialsRef.current.push(frontMat);

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
        },
        undefined,
        () => {
          // Keep woodMat fallback
        }
      );
    }

    // Metal material for handles, aldrops, hinges
    const isBrass = fittingState.handleStyle !== 'steel_modern' && fittingState.handleStyle !== 'minimal_black';
    const metalColor = isBrass ? 0xd4af37 : fittingState.handleStyle === 'minimal_black' ? 0x222222 : 0xcccccc;
    const metalMat = new THREE.MeshStandardMaterial({
      color: metalColor,
      metalness: 0.92,
      roughness: isBrass ? 0.22 : 0.35,
    });

    const hingeMat = new THREE.MeshStandardMaterial({
      color: isBrass ? 0xb8860b : 0x777777,
      metalness: 0.85,
      roughness: 0.3,
    });

    const trimW = 0.018; // 1.8cm edge bevel
    const trimMat = woodMat;
    const hingePositions = [h * 0.18, h * 0.5, h * 0.82];
    const initialRad = (fittingState.doorOpenAngle * Math.PI) / 180;

    if (isDouble) {
      // =========================================================================
      // DOUBLE DOOR (2-Leaf Architectural Construction)
      // Both shutters meet at x = 0 and open independently outwards to side jambs
      // =========================================================================
      const leafW = w / 2;

      // -----------------------------------------------------------------------
      // 1. LEFT SHUTTER: "leftDoorLeaf" (Rotates around LEFT hinge at x = -w / 2)
      // -----------------------------------------------------------------------
      const leftPivot = new THREE.Group();
      leftPivot.name = 'leftDoorLeaf';
      leftPivot.position.set(-w / 2, 0, 0); // Hinge pivot at left jamb
      root.add(leftPivot);
      leftDoorLeafRef.current = leftPivot;

      // Left leaf mesh container (extends from pivot at 0 to +leafW towards center)
      const leftMeshGroup = new THREE.Group();
      leftMeshGroup.name = 'leftMeshGroup';
      leftMeshGroup.position.set(leafW / 2, 0, 0);
      leftPivot.add(leftMeshGroup);

      // Left Leaf Slab Geometry
      const leftLeafGeo = new THREE.BoxGeometry(leafW, h, thickness);
      // Map left half of the catalogue image texture [0.0 to 0.5] to front face (+Z)
      const leftNorm = leftLeafGeo.attributes.normal;
      const leftUv = leftLeafGeo.attributes.uv;
      for (let i = 0; i < leftUv.count; i++) {
        if (leftNorm.getZ(i) > 0.5) {
          const u = leftUv.getX(i);
          leftUv.setX(i, u * 0.5);
        }
      }
      leftUv.needsUpdate = true;

      const leftLeafMesh = new THREE.Mesh(leftLeafGeo, [
        woodMat, // right edge (center meeting edge)
        woodMat, // left edge (hinge edge)
        woodMat, // top edge
        woodMat, // bottom edge
        frontMat, // FRONT FACE: Left half of design
        woodMat, // back face
      ]);
      leftLeafMesh.position.set(0, h / 2, 0);
      leftLeafMesh.castShadow = true;
      leftLeafMesh.receiveShadow = true;
      leftMeshGroup.add(leftLeafMesh);

      // Left Leaf Chamfer Trims
      // Hinge edge trim (left)
      const lTrimLeft = new THREE.Mesh(new THREE.BoxGeometry(trimW, h, thickness * 0.1), trimMat);
      lTrimLeft.position.set(-leafW / 2 + trimW / 2, h / 2, thickness / 2 + thickness * 0.05);
      leftMeshGroup.add(lTrimLeft);

      // Meeting edge trim (right)
      const lTrimRight = new THREE.Mesh(new THREE.BoxGeometry(trimW, h, thickness * 0.1), trimMat);
      lTrimRight.position.set(leafW / 2 - trimW / 2, h / 2, thickness / 2 + thickness * 0.05);
      leftMeshGroup.add(lTrimRight);

      // Top trim
      const lTrimTop = new THREE.Mesh(new THREE.BoxGeometry(leafW, trimW, thickness * 0.1), trimMat);
      lTrimTop.position.set(0, h - trimW / 2, thickness / 2 + thickness * 0.05);
      leftMeshGroup.add(lTrimTop);

      // Bottom trim
      const lTrimBottom = new THREE.Mesh(new THREE.BoxGeometry(leafW, trimW, thickness * 0.1), trimMat);
      lTrimBottom.position.set(0, trimW / 2, thickness / 2 + thickness * 0.05);
      leftMeshGroup.add(lTrimBottom);

      // Left Hinges (positioned on left edge at -leafW / 2)
      hingePositions.forEach(posY => {
        const hingeGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.08, 12);
        const hingeMesh = new THREE.Mesh(hingeGeo, hingeMat);
        hingeMesh.position.set(-leafW / 2 + 0.002, posY, 0);
        hingeMesh.castShadow = true;
        leftMeshGroup.add(hingeMesh);
      });

      // Left Shutter Pull Handle (near center meeting edge at leafW / 2 - 0.055)
      const leftHwdX = leafW / 2 - 0.055;
      const hardwareY = h * 0.48;

      const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 16), metalMat);
      leftHandle.position.set(leftHwdX, hardwareY, thickness / 2 + 0.045);
      leftHandle.castShadow = true;
      leftMeshGroup.add(leftHandle);

      const lPostTop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), metalMat);
      lPostTop.rotation.x = Math.PI / 2;
      lPostTop.position.set(leftHwdX, hardwareY + 0.09, thickness / 2 + 0.022);
      leftMeshGroup.add(lPostTop);

      const lPostBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), metalMat);
      lPostBottom.rotation.x = Math.PI / 2;
      lPostBottom.position.set(leftHwdX, hardwareY - 0.09, thickness / 2 + 0.022);
      leftMeshGroup.add(lPostBottom);

      // -----------------------------------------------------------------------
      // 2. RIGHT SHUTTER: "rightDoorLeaf" (Rotates around RIGHT hinge at x = +w / 2)
      // -----------------------------------------------------------------------
      const rightPivot = new THREE.Group();
      rightPivot.name = 'rightDoorLeaf';
      rightPivot.position.set(w / 2, 0, 0); // Hinge pivot at right jamb
      root.add(rightPivot);
      rightDoorLeafRef.current = rightPivot;

      // Right leaf mesh container (extends from pivot at 0 to -leafW towards center)
      const rightMeshGroup = new THREE.Group();
      rightMeshGroup.name = 'rightMeshGroup';
      rightMeshGroup.position.set(-leafW / 2, 0, 0);
      rightPivot.add(rightMeshGroup);

      // Right Leaf Slab Geometry
      const rightLeafGeo = new THREE.BoxGeometry(leafW, h, thickness);
      // Map right half of the catalogue image texture [0.5 to 1.0] to front face (+Z)
      const rightNorm = rightLeafGeo.attributes.normal;
      const rightUv = rightLeafGeo.attributes.uv;
      for (let i = 0; i < rightUv.count; i++) {
        if (rightNorm.getZ(i) > 0.5) {
          const u = rightUv.getX(i);
          rightUv.setX(i, 0.5 + u * 0.5);
        }
      }
      rightUv.needsUpdate = true;

      const rightLeafMesh = new THREE.Mesh(rightLeafGeo, [
        woodMat, // right edge (hinge edge)
        woodMat, // left edge (center meeting edge)
        woodMat, // top edge
        woodMat, // bottom edge
        frontMat, // FRONT FACE: Right half of design
        woodMat, // back face
      ]);
      rightLeafMesh.position.set(0, h / 2, 0);
      rightLeafMesh.castShadow = true;
      rightLeafMesh.receiveShadow = true;
      rightMeshGroup.add(rightLeafMesh);

      // Right Leaf Chamfer Trims
      // Meeting edge trim (left)
      const rTrimLeft = new THREE.Mesh(new THREE.BoxGeometry(trimW, h, thickness * 0.1), trimMat);
      rTrimLeft.position.set(-leafW / 2 + trimW / 2, h / 2, thickness / 2 + thickness * 0.05);
      rightMeshGroup.add(rTrimLeft);

      // Hinge edge trim (right)
      const rTrimRight = new THREE.Mesh(new THREE.BoxGeometry(trimW, h, thickness * 0.1), trimMat);
      rTrimRight.position.set(leafW / 2 - trimW / 2, h / 2, thickness / 2 + thickness * 0.05);
      rightMeshGroup.add(rTrimRight);

      // Top trim
      const rTrimTop = new THREE.Mesh(new THREE.BoxGeometry(leafW, trimW, thickness * 0.1), trimMat);
      rTrimTop.position.set(0, h - trimW / 2, thickness / 2 + thickness * 0.05);
      rightMeshGroup.add(rTrimTop);

      // Bottom trim
      const rTrimBottom = new THREE.Mesh(new THREE.BoxGeometry(leafW, trimW, thickness * 0.1), trimMat);
      rTrimBottom.position.set(0, trimW / 2, thickness / 2 + thickness * 0.05);
      rightMeshGroup.add(rTrimBottom);

      // Center Meeting Astragal Bead (Decorative central meeting patti on right leaf)
      const astragal = new THREE.Mesh(new THREE.BoxGeometry(0.016, h, 0.005), woodMat);
      astragal.position.set(-leafW / 2 + 0.008, h / 2, thickness / 2 + 0.0025);
      rightMeshGroup.add(astragal);

      // Right Hinges (positioned on right edge at +leafW / 2)
      hingePositions.forEach(posY => {
        const hingeGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.08, 12);
        const hingeMesh = new THREE.Mesh(hingeGeo, hingeMat);
        hingeMesh.position.set(leafW / 2 - 0.002, posY, 0);
        hingeMesh.castShadow = true;
        rightMeshGroup.add(hingeMesh);
      });

      // Right Shutter Hardware (near center meeting edge at -leafW / 2 + 0.055)
      const rightHwdX = -leafW / 2 + 0.055;

      const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 16), metalMat);
      rightHandle.position.set(rightHwdX, hardwareY, thickness / 2 + 0.045);
      rightHandle.castShadow = true;
      rightMeshGroup.add(rightHandle);

      const rPostTop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), metalMat);
      rPostTop.rotation.x = Math.PI / 2;
      rPostTop.position.set(rightHwdX, hardwareY + 0.09, thickness / 2 + 0.022);
      rightMeshGroup.add(rPostTop);

      const rPostBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), metalMat);
      rPostBottom.rotation.x = Math.PI / 2;
      rPostBottom.position.set(rightHwdX, hardwareY - 0.09, thickness / 2 + 0.022);
      rightMeshGroup.add(rPostBottom);

      // Indian Aldrop (Mounted across center meeting stile on right shutter)
      if (fittingState.hardwareName.toLowerCase().includes('aldrop') || isBrass) {
        const aldropBar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 16), metalMat);
        aldropBar.rotation.z = Math.PI / 2;
        aldropBar.position.set(rightHwdX + 0.02, hardwareY + 0.20, thickness / 2 + 0.02);
        aldropBar.castShadow = true;
        rightMeshGroup.add(aldropBar);

        const bracketGeo = new THREE.BoxGeometry(0.025, 0.03, 0.02);
        const b1 = new THREE.Mesh(bracketGeo, metalMat);
        b1.position.set(rightHwdX - 0.04, hardwareY + 0.20, thickness / 2 + 0.01);
        rightMeshGroup.add(b1);

        const b2 = new THREE.Mesh(bracketGeo, metalMat);
        b2.position.set(rightHwdX + 0.08, hardwareY + 0.20, thickness / 2 + 0.01);
        rightMeshGroup.add(b2);
      }

      // Initial Rotation for Double Door (Left rotates +rad to left, Right rotates -rad to right)
      leftPivot.rotation.y = initialRad;
      rightPivot.rotation.y = -initialRad;
    } else {
      // =========================================================================
      // SINGLE DOOR (1-Leaf Traditional Construction - Preserved Exactly)
      // =========================================================================
      const leafPivot = new THREE.Group();
      leafPivot.name = 'leafPivot';
      leafPivot.position.set(-w / 2, 0, 0); // Position pivot at left hinge
      root.add(leafPivot);
      doorLeafGroupRef.current = leafPivot;

      const leafMeshGroup = new THREE.Group();
      leafMeshGroup.position.set(w / 2, 0, 0);
      leafPivot.add(leafMeshGroup);

      const leafGeo = new THREE.BoxGeometry(w, h, thickness);
      const leafMesh = new THREE.Mesh(leafGeo, [
        woodMat, // right edge
        woodMat, // left edge
        woodMat, // top edge
        woodMat, // bottom edge
        frontMat, // FRONT FACE: Entire Catalogue Door Image
        woodMat, // back face
      ]);
      leafMesh.position.set(0, h / 2, 0);
      leafMesh.castShadow = true;
      leafMesh.receiveShadow = true;
      leafMeshGroup.add(leafMesh);

      // Single Door Chamfer Trims
      const lTrim = new THREE.Mesh(new THREE.BoxGeometry(trimW, h, thickness * 0.1), trimMat);
      lTrim.position.set(-w / 2 + trimW / 2, h / 2, thickness / 2 + thickness * 0.05);
      leafMeshGroup.add(lTrim);

      const rTrim = new THREE.Mesh(new THREE.BoxGeometry(trimW, h, thickness * 0.1), trimMat);
      rTrim.position.set(w / 2 - trimW / 2, h / 2, thickness / 2 + thickness * 0.05);
      leafMeshGroup.add(rTrim);

      const tTrim = new THREE.Mesh(new THREE.BoxGeometry(w, trimW, thickness * 0.1), trimMat);
      tTrim.position.set(0, h - trimW / 2, thickness / 2 + thickness * 0.05);
      leafMeshGroup.add(tTrim);

      const bTrim = new THREE.Mesh(new THREE.BoxGeometry(w, trimW, thickness * 0.1), trimMat);
      bTrim.position.set(0, trimW / 2, thickness / 2 + thickness * 0.05);
      leafMeshGroup.add(bTrim);

      // Single Door Hardware
      const hardwareX = w / 2 - 0.055; // Right lock stile
      const hardwareY = h * 0.48;

      const handleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 16), metalMat);
      handleMesh.position.set(hardwareX, hardwareY, thickness / 2 + 0.045);
      handleMesh.castShadow = true;
      leafMeshGroup.add(handleMesh);

      const postTop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), metalMat);
      postTop.rotation.x = Math.PI / 2;
      postTop.position.set(hardwareX, hardwareY + 0.09, thickness / 2 + 0.022);
      leafMeshGroup.add(postTop);

      const postBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12), metalMat);
      postBottom.rotation.x = Math.PI / 2;
      postBottom.position.set(hardwareX, hardwareY - 0.09, thickness / 2 + 0.022);
      leafMeshGroup.add(postBottom);

      if (fittingState.hardwareName.toLowerCase().includes('aldrop') || isBrass) {
        const aldropBar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 16), metalMat);
        aldropBar.rotation.z = Math.PI / 2;
        aldropBar.position.set(hardwareX - 0.02, hardwareY + 0.20, thickness / 2 + 0.02);
        aldropBar.castShadow = true;
        leafMeshGroup.add(aldropBar);

        const bracketGeo = new THREE.BoxGeometry(0.025, 0.03, 0.02);
        const b1 = new THREE.Mesh(bracketGeo, metalMat);
        b1.position.set(hardwareX - 0.08, hardwareY + 0.20, thickness / 2 + 0.01);
        leafMeshGroup.add(b1);

        const b2 = new THREE.Mesh(bracketGeo, metalMat);
        b2.position.set(hardwareX + 0.04, hardwareY + 0.20, thickness / 2 + 0.01);
        leafMeshGroup.add(b2);
      }

      hingePositions.forEach(posY => {
        const hingeGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.08, 12);
        const hingeMesh = new THREE.Mesh(hingeGeo, hingeMat);
        hingeMesh.position.set(-w / 2 + 0.002, posY, 0);
        hingeMesh.castShadow = true;
        leafMeshGroup.add(hingeMesh);
      });

      // Initial Rotation for Single Door
      leafPivot.rotation.y = initialRad;
    }
  };

  // 3. React to Interactive Door Open/Close Angle (Both Shutters for Double Door, Single for Single Door)
  useEffect(() => {
    const rad = (fittingState.doorOpenAngle * Math.PI) / 180;
    if (isDoubleDoorRef.current) {
      // Left shutter rotates around left hinge (0° to +90° opening to the left)
      if (leftDoorLeafRef.current) {
        leftDoorLeafRef.current.rotation.y = rad;
      }
      // Right shutter rotates around right hinge (0° to -90° opening to the right)
      if (rightDoorLeafRef.current) {
        rightDoorLeafRef.current.rotation.y = -rad;
      }
    } else {
      if (doorLeafGroupRef.current) {
        doorLeafGroupRef.current.rotation.y = rad;
      }
    }
  }, [fittingState.doorOpenAngle]);

  // 4. Update Material Colors & Polish dynamically without rebuilding geometry
  useEffect(() => {
    const resolvedColor = fittingState.customHexColor
      ? parseInt(fittingState.customHexColor.replace('#', '0x'), 16)
      : WOOD_COLOR_HEX_MAP[fittingState.colorTone] || 0xc9873c;

    const polishProps = POLISH_QUALITY_MAP[fittingState.finishName] || { roughness: 0.35, metalness: 0.02 };

    doorMaterialsRef.current.forEach(mat => {
      mat.color.setHex(resolvedColor);
      mat.roughness = polishProps.roughness;
      mat.metalness = polishProps.metalness;
      mat.needsUpdate = true;
    });
  }, [fittingState.colorTone, fittingState.customHexColor, fittingState.finishName]);

  // Expose Imperative Controls
  useImperativeHandle(ref, () => ({
    captureCanvasImage: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;
      // Temporarily set scene background to null so the WebGL drawing buffer is 100% transparent PNG with alpha
      const prevBg = sceneRef.current.background;
      sceneRef.current.background = null;
      rendererRef.current.setClearColor(0x000000, 0);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const transparentDataUrl = rendererRef.current.domElement.toDataURL('image/png');
      // Restore showroom background
      sceneRef.current.background = prevBg;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return transparentDataUrl;
    },
    resetView: () => {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(0, 1.05, 3.2);
        controlsRef.current.target.set(0, 1.0, 0);
        controlsRef.current.update();
      }
    },
    rotateHorizontal: (direction: 'left' | 'right') => {
      if (controlsRef.current && cameraRef.current) {
        const angle = direction === 'left' ? -0.25 : 0.25;
        const cam = cameraRef.current;
        const x = cam.position.x;
        const z = cam.position.z;
        cam.position.x = x * Math.cos(angle) - z * Math.sin(angle);
        cam.position.z = x * Math.sin(angle) + z * Math.cos(angle);
        controlsRef.current.update();
      }
    },
    rotateVertical: (direction: 'up' | 'down') => {
      if (cameraRef.current && controlsRef.current) {
        const delta = direction === 'up' ? 0.2 : -0.2;
        cameraRef.current.position.y = Math.max(0.2, Math.min(3.5, cameraRef.current.position.y + delta));
        controlsRef.current.update();
      }
    },
    zoom: (direction: 'in' | 'out') => {
      if (cameraRef.current && controlsRef.current) {
        const factor = direction === 'in' ? 0.85 : 1.15;
        const cam = cameraRef.current;
        cam.position.multiplyScalar(factor);
        controlsRef.current.update();
      }
    },
  }));

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 1.05, 3.2);
      controlsRef.current.target.set(0, 1.0, 0);
      controlsRef.current.update();
    }
  };

  const toggleFullscreen = () => {
    if (!mountRef.current?.parentElement) return;
    if (!document.fullscreenElement) {
      mountRef.current.parentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[420px] bg-[#F8F8F6] border border-[#E5E5E5] select-none overflow-hidden rounded-2xl ${className}`}>
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className={`w-full h-full min-h-[420px] ${viewMode2D ? 'hidden' : 'block'}`}
      />

      {/* 2D Flat Image Fallback Option */}
      {viewMode2D && (
        <div className="w-full h-full min-h-[420px] flex items-center justify-center bg-white p-6">
          <div className="max-w-xs text-center space-y-4">
            <img
              src={resolveImageUrl(door.image || door.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80')}
              alt={door.name}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80') {
                  target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';
                }
              }}
              className="w-full max-h-[360px] object-contain rounded-xl shadow-md border border-[#E5E5E5] mx-auto"
            />
            <p className="text-xs text-[#666666]">
              High-resolution 2D Catalog Photography Preview
            </p>
          </div>
        </div>
      )}

      {/* WebGL Error State */}
      {webGLError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-white/95 text-[#1A1A1A] text-center">
          <AlertCircle className="w-10 h-10 text-[#C89211] mb-3" />
          <h4 className="font-serif text-lg font-bold text-[#1A1A1A] mb-1">3D Hardware Accelerated Mode Unavailable</h4>
          <p className="text-xs text-[#666666] max-w-sm mb-4">
            {webGLError} Showing high-resolution catalog preview instead.
          </p>
          <img
            src={resolveImageUrl(door.image || door.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80')}
            alt={door.name}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80') {
                target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';
              }
            }}
            className="w-48 h-64 object-contain rounded-lg shadow-md border border-[#E5E5E5]"
          />
        </div>
      )}

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs">
          <div className="w-10 h-10 border-3 border-[#C89211] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-[#C89211]">Loading 3D CAD Door Model...</p>
        </div>
      )}

      {/* Top Floating Badge: Model Fidelity Indicator */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-[#C89211]/40 text-[11px] font-semibold text-[#C89211] shadow-md backdrop-blur-md"
          title={
            isDoorDoubleDoor(door, fittingState.isDoubleDoor)
              ? 'Double Door: Two independent shutters hinged on left and right jambs with synchronized opposite opening'
              : modelType === 'cad'
              ? 'True 3D CAD model (.glb) attached to this catalogue product'
              : 'Using original catalogue image & proportions with interactive 3D rotation, lighting and finish preview'
          }
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
          <span>
            {isDoorDoubleDoor(door, fittingState.isDoubleDoor)
              ? 'Double Door (2-Leaf Shutters)'
              : modelType === 'cad'
              ? 'Genuine 3D Model (GLB)'
              : 'Catalogue Design (Photo Projection 3D)'}
          </span>
        </span>

        {/* 2D / 3D Mode Switcher */}
        <button
          onClick={() => setViewMode2D(!viewMode2D)}
          className="px-2.5 py-1 rounded-full bg-white/90 hover:bg-white text-[#1A1A1A] hover:text-[#C89211] border border-[#E5E5E5] text-[11px] font-medium transition-colors shadow-sm backdrop-blur-md flex items-center gap-1 cursor-pointer"
          title="Toggle between 3D Model and 2D Photography"
        >
          <Layers className="w-3 h-3 text-[#C89211]" />
          <span>{viewMode2D ? 'Switch to 3D' : 'View 2D'}</span>
        </button>
      </div>

      {/* Floating On-Screen 3D Interaction Controls */}
      {showControls && !viewMode2D && (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Left Controls: Door Hinge Open Slider */}
          <div className="pointer-events-auto bg-white/95 border border-[#E5E5E5] rounded-xl px-3 py-2 shadow-md backdrop-blur-md flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#1A1A1A] whitespace-nowrap">
              {isDoorDoubleDoor(door, fittingState.isDoubleDoor) ? 'Open Shutters:' : 'Open Door:'}
            </span>
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={fittingState.doorOpenAngle}
              onChange={e => onOpenAngleChange?.(Number(e.target.value))}
              className="w-20 sm:w-28 accent-[#C89211] cursor-pointer h-1.5 bg-stone-200 rounded-lg"
              title={
                isDoorDoubleDoor(door, fittingState.isDoubleDoor)
                  ? 'Drag to open both left & right door shutters in opposite directions'
                  : 'Drag to swing open the 3D door on its hinges'
              }
            />
            <span className="text-[11px] font-mono font-bold text-[#C89211] w-6">
              {fittingState.doorOpenAngle}°
            </span>
          </div>

          {/* Right Controls: Camera Tools */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 border border-[#E5E5E5] rounded-xl p-1.5 shadow-md backdrop-blur-md">
            {/* Zoom In */}
            <button
              onClick={() => {
                if (cameraRef.current && controlsRef.current) {
                  cameraRef.current.position.multiplyScalar(0.85);
                  controlsRef.current.update();
                }
              }}
              className="p-2 rounded-lg text-[#666666] hover:text-[#C89211] hover:bg-stone-100 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={() => {
                if (cameraRef.current && controlsRef.current) {
                  cameraRef.current.position.multiplyScalar(1.15);
                  controlsRef.current.update();
                }
              }}
              className="p-2 rounded-lg text-[#666666] hover:text-[#C89211] hover:bg-stone-100 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Reset Camera */}
            <button
              onClick={handleResetCamera}
              className="p-2 rounded-lg text-[#666666] hover:text-[#C89211] hover:bg-stone-100 transition-colors cursor-pointer"
              title="Reset 3D Viewpoint"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-[#666666] hover:text-[#C89211] hover:bg-stone-100 transition-colors hidden sm:inline-flex cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Subtle Mobile Gesture Guidance Pill */}
      {!viewMode2D && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 border border-[#E5E5E5] text-[10px] text-[#666666] backdrop-blur-xs shadow-xs">
          <span>Drag to rotate • Pinch to zoom</span>
        </div>
      )}
    </div>
  );
});

Door3DScene.displayName = 'Door3DScene';
