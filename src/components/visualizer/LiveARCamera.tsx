import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import {
  Camera,
  VideoOff,
  Move,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Upload,
  Compass,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Square,
  FlipHorizontal,
  CheckCircle2,
  Box,
  Layers,
  DoorOpen,
  DoorClosed,
  MessageCircle,
  Ruler,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Eye,
} from 'lucide-react';
import { Door, CustomDoorFittingState } from '../../types.ts';
import { buildArchitectural3DDoor, BuiltDoorResult } from '../../lib/door3DBuilder.ts';
import { getWhatsAppUrl } from '../../lib/contactUtils.ts';

export interface LiveARCameraProps {
  door: Door;
  allDoors?: Door[];
  onSelectDoor?: (door: Door) => void;
  fittingState: CustomDoorFittingState;
  onUpdateFittingState?: (updated: Partial<CustomDoorFittingState>) => void;
  doorSnapshotUrl?: string | null;
  onCaptureComposite: (compositeDataUrl: string) => void;
  onFallbackToPhotoUpload: () => void;
  onOpenQuotation?: () => void;
  className?: string;
}

type CameraErrorType =
  | 'denied'
  | 'iframe_blocked'
  | 'not_found'
  | 'in_use'
  | 'overconstrained'
  | 'insecure'
  | 'unsupported'
  | 'unknown';

export const LiveARCamera: React.FC<LiveARCameraProps> = ({
  door,
  allDoors = [],
  onSelectDoor,
  fittingState,
  onUpdateFittingState,
  doorSnapshotUrl,
  onCaptureComposite,
  onFallbackToPhotoUpload,
  onOpenQuotation,
  className = '',
}) => {
  // Camera & System State
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [errorType, setErrorType] = useState<CameraErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [showHelpDetails, setShowHelpDetails] = useState<boolean>(false);
  const [webXRSupported, setWebXRSupported] = useState<boolean>(false);

  // Environment checks
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [isSecure, setIsSecure] = useState<boolean>(true);

  // Active Control Tabs: 'position' | 'dimensions' | 'angle' | 'designs'
  const [activeTab, setActiveTab] = useState<'position' | 'dimensions' | 'angle' | 'designs'>('position');

  // Single Reliable 3D Transformation State
  const [posX, setPosX] = useState<number>(0); // Offset % (-60 to 60)
  const [posY, setPosY] = useState<number>(0); // Offset % (-60 to 60)
  const [scale, setScale] = useState<number>(65); // Zoom/Scale % (25 to 180)
  const [rotateY, setRotateY] = useState<number>(0); // Full 360° Horizontal turn (-180 to 180 deg)
  const [rotateX, setRotateX] = useState<number>(0); // Vertical pitch/tilt (-35 to 35 deg)
  const [rotateZ, setRotateZ] = useState<number>(0); // Roll angle (-15 to 15 deg)
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [hasFrame, setHasFrame] = useState<boolean>(true);
  const [customWidth, setCustomWidth] = useState<number>(fittingState.widthInch || 36);
  const [customHeight, setCustomHeight] = useState<number>(fittingState.heightInch || 78);
  const [doorOpenAngle, setDoorOpenAngle] = useState<number>(fittingState.doorOpenAngle || 0);

  // Gesture Interaction Mode: 'position' (drag to move) vs 'rotate' (drag to orbit/rotate 360)
  const [gestureMode, setGestureMode] = useState<'position' | 'rotate'>('position');
  // Auto 360° Continuous Smooth Tour
  const [autoRotate360, setAutoRotate360] = useState<boolean>(false);

  // Synchronized state refs for event listeners
  const posXRef = useRef(posX);
  posXRef.current = posX;
  const posYRef = useRef(posY);
  posYRef.current = posY;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const rotateYRef = useRef(rotateY);
  rotateYRef.current = rotateY;
  const rotateXRef = useRef(rotateX);
  rotateXRef.current = rotateX;
  const gestureModeRef = useRef(gestureMode);
  gestureModeRef.current = gestureMode;

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Three.js Instances Ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const doorPivotRef = useRef<THREE.Group | null>(null);
  const doorRootRef = useRef<THREE.Group | null>(null);
  const builtDoorRef = useRef<BuiltDoorResult | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Desktop Mouse Drag state
  const isMouseDownRef = useRef(false);
  const mouseStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0, rotY: 0, rotX: 0, isRotateDrag: false });

  // When tab changes, intelligently sync default gesture mode
  const handleTabChange = (tab: 'position' | 'dimensions' | 'angle' | 'designs') => {
    setActiveTab(tab);
    if (tab === 'position') setGestureMode('position');
    if (tab === 'angle') setGestureMode('rotate');
  };

  // Helper to format angle labels (0° Front, 90° Right, 180° Back, 270° Left)
  const getAngleLabel = (angle: number): string => {
    let norm = Math.round(angle);
    while (norm < 0) norm += 360;
    while (norm >= 360) norm -= 360;
    if (norm >= 340 || norm <= 20) return `${norm}° (Front)`;
    if (norm >= 70 && norm <= 110) return `${norm}° (Right Side)`;
    if (norm >= 160 && norm <= 200) return `${norm}° (Back View)`;
    if (norm >= 250 && norm <= 290) return `${norm}° (Left Side)`;
    return `${norm}°`;
  };

  // Environment checks on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const inIframe = window.self !== window.top;
      setIsInIframe(inIframe);

      const secure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsSecure(secure);

      // Check available cameras
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices
          .enumerateDevices()
          .then(devices => {
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            setHasMultipleCameras(videoInputs.length > 1);
          })
          .catch(() => {});
      }

      // Check WebXR
      if ('xr' in navigator && (navigator as any).xr?.isSessionSupported) {
        (navigator as any).xr
          .isSessionSupported('immersive-ar')
          .then((supported: boolean) => {
            setWebXRSupported(Boolean(supported));
          })
          .catch(() => {
            setWebXRSupported(false);
          });
      }
    }
  }, []);

  // Stop camera media tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && streamRef.current) {
        stopCameraStream();
        setCameraState('idle');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCameraStream();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [stopCameraStream]);

  // Request Camera Stream with progressive fallback
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    setCameraState('requesting');
    setErrorType(null);
    setErrorMessage(null);

    stopCameraStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('error');
      setErrorType('unsupported');
      setErrorMessage('The Camera API is not supported on this browser or webview.');
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraState('error');
      setErrorType('insecure');
      setErrorMessage('Camera access requires an HTTPS connection. Please access the website via HTTPS.');
      return;
    }

    let stream: MediaStream | null = null;
    let lastError: any = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err: any) {
      lastError = err;
    }

    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: targetFacing } },
          audio: false,
        });
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!stream && targetFacing === 'environment') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        targetFacing = 'user';
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err: any) {
        lastError = err;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setFacingMode(targetFacing);
      setCameraState('active');

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
        };
      }
    } else {
      setCameraState('error');
      const errName = lastError?.name || '';
      const inIframe = window.self !== window.top;

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        if (inIframe) {
          setErrorType('iframe_blocked');
          setErrorMessage(
            'Camera access was restricted by the browser or AI Studio preview container. Hardware camera access is restricted inside embedded iframes.'
          );
        } else {
          setErrorType('denied');
          setErrorMessage(
            'Camera permission was denied. Tap "Try Again" below, or enable camera access in your browser or phone app settings.'
          );
        }
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorType('not_found');
        setErrorMessage('No camera device was found on your current hardware. You can use "Upload Entrance Photo" instead.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setErrorType('in_use');
        setErrorMessage('Your camera is currently in use by another application. Please close other camera apps and tap "Try Again".');
      } else if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
        setErrorType('overconstrained');
        setErrorMessage('The requested camera settings are not supported. Tap "Try Again" to retry with basic settings.');
      } else if (errName === 'SecurityError') {
        setErrorType('insecure');
        setErrorMessage('Camera access was blocked due to security restrictions. Ensure you are browsing over HTTPS.');
      } else {
        setErrorType('unknown');
        setErrorMessage(lastError?.message || 'Could not initialize camera on this device.');
      }
    }
  };

  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextMode);
  };

  const handleStopCamera = () => {
    stopCameraStream();
    setCameraState('idle');
  };

  // Initialize Three.js WebGL Scene on canvas mount
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.1, 2.5);
    camera.lookAt(0, 1.0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.3);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.5);
    dirLight.position.set(1.5, 3.5, 2.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.7);
    fillLight.position.set(-2, 2, 1);
    scene.add(fillLight);

    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const doorRoot = new THREE.Group();
    scene.add(doorRoot);
    doorRootRef.current = doorRoot;

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!canvas || !rendererRef.current || !cameraRef.current) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Rebuild 3D Door when structural specs or catalogue design change
  useEffect(() => {
    if (!doorRootRef.current) return;

    const doorW = (customWidth || 36) * 0.0254;
    const doorH = (customHeight || 78) * 0.0254;
    const doorThick = (fittingState.thicknessInch || 1.5) * 0.0254;
    const frameW = 0.075;
    const frameDepth = 0.12;

    const result = buildArchitectural3DDoor(doorRootRef.current, {
      door,
      fittingState: {
        ...fittingState,
        widthInch: customWidth,
        heightInch: customHeight,
        doorOpenAngle,
      },
      doorW,
      doorH,
      doorThick,
      hasFrame,
      frameW,
      frameDepth,
    });

    builtDoorRef.current = result;
    doorPivotRef.current = result.leafPivot;

    // Apply active placement transforms immediately to newly generated meshes
    const root = doorRootRef.current;
    root.position.x = (posX / 100) * 1.8;
    root.position.y = (posY / 100) * 1.4;
    const s = scale / 100;
    root.scale.set(s, s, s);
    root.rotation.y = (rotateY * Math.PI) / 180;
    root.rotation.x = (rotateX * Math.PI) / 180;
    root.rotation.z = (rotateZ * Math.PI) / 180;

    if (result.leafPivot) {
      result.leafPivot.rotation.y = ((doorOpenAngle || 0) * Math.PI) / 180;
    }
  }, [
    door.id,
    door.images,
    door.model3d,
    customWidth,
    customHeight,
    fittingState.woodType,
    fittingState.thicknessInch,
    fittingState.colorTone,
    fittingState.customHexColor,
    fittingState.finishName,
    fittingState.handleStyle,
    hasFrame,
  ]);

  // Update Door Opening Angle instantaneously without rebuilding geometry
  useEffect(() => {
    if (doorPivotRef.current) {
      const rad = ((doorOpenAngle || 0) * Math.PI) / 180;
      doorPivotRef.current.rotation.y = rad;
    }
  }, [doorOpenAngle]);

  // Update 3D Door Placement Transform (Position, Scale, Rotation) in real time
  useEffect(() => {
    if (!doorRootRef.current) return;

    const root = doorRootRef.current;
    root.position.x = (posX / 100) * 1.8;
    root.position.y = (posY / 100) * 1.4;

    const s = scale / 100;
    root.scale.set(s, s, s);

    root.rotation.y = (rotateY * Math.PI) / 180;
    root.rotation.x = (rotateX * Math.PI) / 180;
    root.rotation.z = (rotateZ * Math.PI) / 180;
  }, [posX, posY, scale, rotateY, rotateX, rotateZ]);

  // Continuous 360° Auto-Tour Spin
  useEffect(() => {
    if (!autoRotate360) return;
    let animId: number;
    const step = () => {
      setRotateY(prev => {
        let next = prev + 0.6;
        if (next > 180) next -= 360;
        return Math.round(next * 10) / 10;
      });
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate360]);

  // Native Mobile Touch Gestures (Pinch to Zoom, 1-finger Move/Rotate, 2-finger Orbit)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartDist = 0;
    let touchStartScale = 65;
    let touchStartMidX = 0;
    let touchStartRotY = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartPosX = 0;
    let touchStartPosY = 0;
    let touchStartRotX = 0;
    let isTouching = false;

    const onTouchStart = (e: TouchEvent) => {
      // Pause 360° auto-tour when customer touches canvas
      setAutoRotate360(false);

      if (e.touches.length === 1) {
        isTouching = true;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartPosX = posXRef.current;
        touchStartPosY = posYRef.current;
        touchStartRotY = rotateYRef.current;
        touchStartRotX = rotateXRef.current;
      } else if (e.touches.length === 2) {
        isTouching = true;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        touchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        touchStartScale = scaleRef.current;
        touchStartMidX = (t0.clientX + t1.clientX) / 2;
        touchStartRotY = rotateYRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouching) return;
      // Prevent browser pinch zoom or page scroll while interacting with visualizer canvas
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 400;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const deltaX = t.clientX - touchStartX;
        const deltaY = t.clientY - touchStartY;

        if (gestureModeRef.current === 'position') {
          // Reposition door
          const percentX = (deltaX / width) * 100;
          const percentY = (deltaY / height) * 100;
          const newX = Math.max(-60, Math.min(60, touchStartPosX + percentX));
          const newY = Math.max(-60, Math.min(60, touchStartPosY - percentY));
          setPosX(Math.round(newX * 10) / 10);
          setPosY(Math.round(newY * 10) / 10);
        } else {
          // Rotate 360° horizontally & tilt vertically
          const rotDeltaY = (deltaX / width) * 360;
          const rotDeltaX = (deltaY / height) * 70;
          let newRotY = touchStartRotY + rotDeltaY;
          while (newRotY > 180) newRotY -= 360;
          while (newRotY < -180) newRotY += 360;
          const newRotX = Math.max(-35, Math.min(35, touchStartRotX - rotDeltaX));
          setRotateY(Math.round(newRotY));
          setRotateX(Math.round(newRotX));
        }
      } else if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

        // Pinch to Zoom
        if (touchStartDist > 0) {
          const pinchFactor = currentDist / touchStartDist;
          const newScale = Math.max(25, Math.min(180, touchStartScale * pinchFactor));
          setScale(Math.round(newScale));
        }

        // Two-finger horizontal rotation / orbit
        const currentMidX = (t0.clientX + t1.clientX) / 2;
        const deltaMidX = currentMidX - touchStartMidX;
        if (Math.abs(deltaMidX) > 4) {
          const rotDelta = (deltaMidX / width) * 180;
          let newRotY = touchStartRotY + rotDelta;
          while (newRotY > 180) newRotY -= 360;
          while (newRotY < -180) newRotY += 360;
          setRotateY(Math.round(newRotY));
        }
      }
    };

    const onTouchEnd = () => {
      isTouching = false;
    };

    // Wheel zoom on desktop
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 6 : -6;
      setScale(prev => Math.max(25, Math.min(180, prev + delta)));
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Desktop Mouse Drag Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    setAutoRotate360(false);
    isMouseDownRef.current = true;
    const isRotateDrag = e.button === 2 || e.shiftKey || gestureMode === 'rotate';
    mouseStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX,
      posY,
      rotY: rotateY,
      rotX: rotateX,
      isRotateDrag,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 400;
    const deltaX = e.clientX - mouseStartRef.current.x;
    const deltaY = e.clientY - mouseStartRef.current.y;

    if (mouseStartRef.current.isRotateDrag || gestureMode === 'rotate') {
      const rotDeltaY = (deltaX / width) * 360;
      const rotDeltaX = (deltaY / height) * 70;
      let newRotY = mouseStartRef.current.rotY + rotDeltaY;
      while (newRotY > 180) newRotY -= 360;
      while (newRotY < -180) newRotY += 360;
      const newRotX = Math.max(-35, Math.min(35, mouseStartRef.current.rotX - rotDeltaX));
      setRotateY(Math.round(newRotY));
      setRotateX(Math.round(newRotX));
    } else {
      const percentX = (deltaX / width) * 100;
      const percentY = (deltaY / height) * 100;
      setPosX(Math.round(Math.max(-60, Math.min(60, mouseStartRef.current.posX + percentX)) * 10) / 10);
      setPosY(Math.round(Math.max(-60, Math.min(60, mouseStartRef.current.posY - percentY)) * 10) / 10);
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  // Zoom Buttons Handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(180, prev + 10));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(25, prev - 10));
  };

  // Reset View Handler (Restores default values)
  const handleResetView = () => {
    setPosX(0);
    setPosY(0);
    setScale(65);
    setRotateY(0);
    setRotateX(0);
    setRotateZ(0);
    setDoorOpenAngle(0);
    setAutoRotate360(false);
    setGestureMode('position');
    if (onUpdateFittingState) onUpdateFittingState({ doorOpenAngle: 0 });
  };

  // Side View / Orbit Presets
  const handleApplyOrbitPreset = (angleY: number, angleX = 0) => {
    setAutoRotate360(false);
    setRotateY(angleY);
    setRotateX(angleX);
    setRotateZ(0);
  };

  // High-Res Composite AR Capture
  const handleCaptureLiveAR = () => {
    if (!containerRef.current) return;

    const canvas = document.createElement('canvas');
    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw live camera background frame if video is active
    if (videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw 3D Three.js WebGL canvas on top
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      ctx.drawImage(rendererRef.current.domElement, 0, 0, width, height);
    }

    // 3. Official Jai Hanuman Door Watermark
    ctx.fillStyle = 'rgba(18, 16, 14, 0.92)';
    ctx.fillRect(20, canvas.height - 90, canvas.width - 40, 70);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, canvas.height - 90, canvas.width - 40, 70);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`JAI HANUMAN DOOR • LIVE AR 3D VISUALIZER • ${door.name}`, 36, canvas.height - 56);

    ctx.fillStyle = '#d6d3d1';
    ctx.font = '13px monospace';
    ctx.fillText(
      `${fittingState.woodType} • ${customWidth}" × ${customHeight}" • WhatsApp: +91 78874 12884`,
      36,
      canvas.height - 32
    );

    const capturedUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCaptureComposite(capturedUrl);
  };

  // WhatsApp Enquiry with current AR configuration
  const handleWhatsAppEnquiry = () => {
    const text = `Hello Jai Hanuman Door,
I customized "${door.name}" (ID: ${door.id}) in your Live AR 3D Door Visualizer:
- Dimensions: ${customWidth}" × ${customHeight}" (Thickness: ${fittingState.thicknessInch}")
- Wood: ${fittingState.woodType}
- Current View: ${getAngleLabel(rotateY)} at ${scale}% scale
- Door Opening: ${doorOpenAngle}°
- Price Estimate: ₹${door.startingPrice.toLocaleString('en-IN')}

Please share quotation and installation details for my home entrance.`;
    window.open(getWhatsAppUrl('7887412884', text), '_blank');
  };

  return (
    <div className={`flex flex-col bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden shadow-md ${className}`}>
      {/* Top Bar / Branding & Status */}
      <div className="px-4 py-3 bg-[#F8F8F6] border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#1A1A1A]">
          <div className="w-6 h-6 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center">
            <Box className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-[#1A1A1A] block text-xs">Live AR 3D Door Visualizer</span>
            <span className="text-[11px] text-[#666666]">
              Selected: <strong className="text-[#C89211]">{door.name}</strong> • {customWidth}" × {customHeight}"
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cameraState === 'active' && (
            <>
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Switch between front and back camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-[#C89211]" />
                  <span>{facingMode === 'environment' ? 'Front Cam' : 'Rear Cam'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStopCamera}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Stop camera"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Camera</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onFallbackToPhotoUpload}
            className="text-[#C89211] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            title="Upload an entrance photo instead"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#F8F8F6] flex items-center justify-center overflow-hidden select-none">
        {/* STATE 1: Idle Prompt */}
        {cameraState === 'idle' && (
          <div className="p-6 text-center max-w-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center mx-auto text-[#C89211] shadow-md">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
                Live AR 3D Door Visualizer
              </h3>
              <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
                Aim your phone camera at your entrance. The selected 3D Catalogue door with full Chaukhat frame and wood carving will be placed in real-world dimensions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Start Live AR Camera</span>
              </button>
            </div>

            <p className="text-[11px] text-[#666666] flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Camera stays 100% on your device and is never recorded</span>
            </p>
          </div>
        )}

        {/* STATE 2: Requesting Permission */}
        {cameraState === 'requesting' && (
          <div className="p-6 text-center max-w-md space-y-4 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center mx-auto text-[#C89211]">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Opening Camera Stream...
              </h3>
              <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
                Please tap <strong>"Allow"</strong> when prompted by your browser or Android device.
              </p>
            </div>
          </div>
        )}

        {/* STATE 3: Error or Permission Denied */}
        {cameraState === 'error' && (
          <div className="p-6 text-center max-w-lg space-y-4 overflow-y-auto max-h-full">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center mx-auto text-[#C89211]">
              <VideoOff className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="font-serif text-lg font-bold text-[#1A1A1A]">
                {errorType === 'iframe_blocked'
                  ? 'Camera Restricted in Preview Container'
                  : errorType === 'denied'
                  ? 'Camera Access Not Granted'
                  : errorType === 'not_found'
                  ? 'No Camera Device Found'
                  : errorType === 'in_use'
                  ? 'Camera Currently in Use'
                  : 'Camera Access Unavailable'}
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed max-w-md mx-auto">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="px-5 py-2.5 bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              {isInIframe && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white hover:bg-stone-50 text-[#C89211] border border-[#C89211]/40 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Full Tab</span>
                </a>
              )}

              <button
                type="button"
                onClick={onFallbackToPhotoUpload}
                className="px-4 py-2.5 bg-white hover:bg-stone-50 text-[#1A1A1A] border border-[#E5E5E5] font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Use Entrance Photo Upload</span>
              </button>
            </div>

            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={() => setShowHelpDetails(!showHelpDetails)}
                className="text-[#666666] hover:text-[#C89211] text-xs flex items-center gap-1 mx-auto transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#C89211]" />
                <span>How to enable camera permission on Android</span>
                {showHelpDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHelpDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-white border border-[#E5E5E5] text-[11px] text-[#1A1A1A] space-y-2 shadow-sm">
                  <p className="font-semibold text-[#C89211]">Step-by-step instructions:</p>
                  <ul className="space-y-1.5 list-disc list-inside text-[#666666]">
                    <li>
                      <strong className="text-[#1A1A1A]">Chrome on Android:</strong> Tap the lock or tune icon in the address bar &gt; Tap <em>Permissions</em> &gt; Set <em>Camera</em> to <strong>Allow</strong>.
                    </li>
                    <li>
                      <strong className="text-[#1A1A1A]">Android App:</strong> Phone <em>Settings</em> &gt; <em>Apps</em> &gt; <em>Jai Hanuman Door</em> &gt; <em>Permissions</em> &gt; Enable <strong>Camera</strong>.
                    </li>
                    <li>
                      <strong className="text-[#1A1A1A]">AI Studio Preview:</strong> Hardware camera access is restricted in embedded iframes. Open the app in a full browser tab.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE 4: Camera Active & Real-Time 3D Interactive Canvas */}
        <div
          ref={containerRef}
          className={`relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden ${
            cameraState === 'active' ? 'block' : 'hidden'
          }`}
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Live Video Feed Background */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover pointer-events-none"
          />

          {/* Transparent 3D Three.js Canvas Overlaid on Camera */}
          <canvas
            ref={threeCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Floor Alignment Grid */}
          {showGrid && (
            <div className="absolute bottom-0 left-0 right-0 h-1/4 pointer-events-none border-t border-amber-500/25 bg-gradient-to-t from-amber-500/10 to-transparent">
              <div className="w-full h-full flex justify-around opacity-30">
                <div className="border-r border-amber-400/40 w-1/4" />
                <div className="border-r border-amber-400/40 w-1/4" />
                <div className="border-r border-amber-400/40 w-1/4" />
              </div>
            </div>
          )}

          {/* Top-Left Status HUD Badges */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1.5">
            <div className="px-3 py-1 rounded-full bg-white/95 border border-emerald-500/40 text-[11px] font-bold text-emerald-700 backdrop-blur-md flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live 3D AR ({facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'})</span>
            </div>

            <div className="px-2.5 py-0.5 rounded-full bg-white/90 border border-[#E5E5E5] text-[10px] text-[#C89211] backdrop-blur-md font-mono flex items-center gap-1.5 shadow-sm">
              <span>Zoom: {scale}%</span>
              <span>•</span>
              <span>Angle: {getAngleLabel(rotateY)}</span>
            </div>
          </div>

          {/* Top-Right Floating Controls (Door Open/Close & 360 Auto-Tour) */}
          <div className="absolute top-3 right-3 z-10 pointer-events-auto flex flex-col gap-2">
            {/* Quick Door Open/Close */}
            <button
              type="button"
              onClick={() => {
                const nextAngle = doorOpenAngle > 10 ? 0 : 75;
                setDoorOpenAngle(nextAngle);
                if (onUpdateFittingState) onUpdateFittingState({ doorOpenAngle: nextAngle });
              }}
              className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-[#C89211] border border-[#C89211]/30 text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
              title="Open or Close Door Leaf on Hinges"
            >
              {doorOpenAngle > 10 ? <DoorOpen className="w-4 h-4 text-emerald-600" /> : <DoorClosed className="w-4 h-4 text-[#C89211]" />}
              <span>{doorOpenAngle > 10 ? 'Close Door' : 'Open Door'}</span>
            </button>

            {/* 360° Auto-Tour Button */}
            <button
              type="button"
              onClick={() => setAutoRotate360(!autoRotate360)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer border ${
                autoRotate360
                  ? 'bg-[#C89211] text-white border-[#C89211] ring-2 ring-[#C89211]/30 animate-pulse'
                  : 'bg-white/95 hover:bg-white text-[#1A1A1A] border-[#E5E5E5]'
              }`}
              title="Smoothly rotate door through 360°"
            >
              {autoRotate360 ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{autoRotate360 ? 'Pause 360°' : '360° View'}</span>
            </button>
          </div>

          {/* Bottom Floating Control Bar (Mode Switcher & Preset Views) */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Gesture Mode Switcher Pills (Pointer Events Auto) */}
            <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-white/95 border border-[#E5E5E5] backdrop-blur-md shadow-md">
              <button
                type="button"
                onClick={() => setGestureMode('position')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  gestureMode === 'position'
                    ? 'bg-[#C89211] text-white font-bold shadow-sm'
                    : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Move</span>
              </button>

              <button
                type="button"
                onClick={() => setGestureMode('rotate')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  gestureMode === 'rotate'
                    ? 'bg-[#C89211] text-white font-bold shadow-sm'
                    : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate 360°</span>
              </button>
            </div>

            {/* Orbit Preset Buttons */}
            <div className="pointer-events-auto hidden sm:flex items-center gap-1 p-1 rounded-xl bg-white/95 border border-[#E5E5E5] backdrop-blur-md shadow-md text-[11px]">
              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(0)}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  Math.abs(rotateY) <= 15 ? 'bg-[#C89211] text-white font-bold' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(-90)}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  Math.abs(rotateY - -90) <= 15 ? 'bg-[#C89211] text-white font-bold' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Left -90°
              </button>
              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(180)}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  Math.abs(Math.abs(rotateY) - 180) <= 15 ? 'bg-[#C89211] text-white font-bold' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Back 180°
              </button>
              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(90)}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  Math.abs(rotateY - 90) <= 15 ? 'bg-[#C89211] text-white font-bold' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Right +90°
              </button>
            </div>

            {/* Floating Zoom & Reset Controls */}
            <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-white/95 border border-[#E5E5E5] backdrop-blur-md shadow-md">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#666666] hover:text-[#C89211] transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-xs font-bold text-[#C89211] px-1 min-w-[38px] text-center">
                {scale}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#666666] hover:text-[#C89211] transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className="ml-1 px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[11px] font-semibold text-[#1A1A1A] transition cursor-pointer"
                title="Reset position, scale, and rotation to default"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Suite (Position & Scale, Dimensions, 3D Tilt & Open, Designs) */}
      <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E5E5] space-y-3.5">
        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => handleTabChange('position')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'position' ? 'bg-[#C89211] text-white shadow-sm' : 'text-[#666666] hover:bg-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Position &amp; Scale</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('dimensions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'dimensions' ? 'bg-[#C89211] text-white shadow-sm' : 'text-[#666666] hover:bg-white'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Dimensions</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('angle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'angle' ? 'bg-[#C89211] text-white shadow-sm' : 'text-[#666666] hover:bg-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3D Tilt &amp; Open</span>
            </button>

            {allDoors.length > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange('designs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'designs' ? 'bg-[#C89211] text-white shadow-sm' : 'text-[#666666] hover:bg-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Switch Design ({allDoors.length})</span>
              </button>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCaptureLiveAR}
              className="px-4 py-2 bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Capture AR Photo</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppEnquiry}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow transition cursor-pointer"
              title="WhatsApp Enquiry with Current AR Configuration"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: Position & Scale */}
        {activeTab === 'position' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Zoom / Scale Control with Minus / Plus buttons */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#1A1A1A] font-medium">
                <span>Room Scale / Zoom:</span>
                <span className="font-mono text-[#C89211] font-bold">{scale}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] flex items-center justify-center font-bold text-sm border border-[#E5E5E5] cursor-pointer shadow-sm"
                >
                  -
                </button>
                <input
                  type="range"
                  min="25"
                  max="180"
                  value={scale}
                  onChange={e => setScale(Number(e.target.value))}
                  className="flex-1 accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] flex items-center justify-center font-bold text-sm border border-[#E5E5E5] cursor-pointer shadow-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Horizontal Offset X */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#1A1A1A] font-medium">
                <span>Horizontal Offset (X):</span>
                <span className="font-mono text-[#C89211]">{posX}%</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                value={posX}
                onChange={e => setPosX(Number(e.target.value))}
                className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
              />
            </div>

            {/* Vertical Offset Y */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#1A1A1A] font-medium">
                <span>Vertical Offset (Y):</span>
                <span className="font-mono text-[#C89211]">{posY}%</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                value={posY}
                onChange={e => setPosY(Number(e.target.value))}
                className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
              />
            </div>

            {/* Quick Actions & Reset */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#1A1A1A] font-medium">
                <span>Floor Grid:</span>
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className="text-[#C89211] hover:underline cursor-pointer"
                >
                  {showGrid ? 'Hide Grid' : 'Show Grid'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetView}
                className="w-full py-1.5 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] text-[11px] font-medium border border-[#E5E5E5] transition cursor-pointer shadow-sm"
              >
                Reset Position &amp; Scale
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Dimensions & Frame Customization */}
        {activeTab === 'dimensions' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Width Input */}
              <div className="space-y-1.5">
                <label className="text-[#1A1A1A] font-medium flex justify-between">
                  <span>Door Width:</span>
                  <span className="font-mono text-[#C89211] font-bold">{customWidth} Inches</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="24"
                    max="96"
                    value={customWidth}
                    onChange={e => {
                      const val = Math.max(20, Math.min(100, Number(e.target.value)));
                      setCustomWidth(val);
                      if (onUpdateFittingState) onUpdateFittingState({ widthInch: val });
                    }}
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono font-bold text-xs"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[30, 32, 34, 36, 48].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setCustomWidth(w);
                          if (onUpdateFittingState) onUpdateFittingState({ widthInch: w });
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition cursor-pointer ${
                          customWidth === w ? 'bg-[#C89211] text-white border-[#C89211] font-bold' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                        }`}
                      >
                        {w}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Height Input */}
              <div className="space-y-1.5">
                <label className="text-[#1A1A1A] font-medium flex justify-between">
                  <span>Door Height:</span>
                  <span className="font-mono text-[#C89211] font-bold">{customHeight} Inches</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="60"
                    max="108"
                    value={customHeight}
                    onChange={e => {
                      const val = Math.max(50, Math.min(120, Number(e.target.value)));
                      setCustomHeight(val);
                      if (onUpdateFittingState) onUpdateFittingState({ heightInch: val });
                    }}
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono font-bold text-xs"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[78, 81, 84, 90, 96].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setCustomHeight(h);
                          if (onUpdateFittingState) onUpdateFittingState({ heightInch: h });
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition cursor-pointer ${
                          customHeight === h ? 'bg-[#C89211] text-white border-[#C89211] font-bold' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                        }`}
                      >
                        {h}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: 3D Tilt & Open */}
        {activeTab === 'angle' && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Full 360° Horizontal Orbit Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Horizontal Rotation (360°):</span>
                  <span className="font-mono text-[#C89211] font-bold">{getAngleLabel(rotateY)}</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotateY}
                  onChange={e => {
                    setAutoRotate360(false);
                    setRotateY(Number(e.target.value));
                  }}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              {/* Vertical Pitch / Tilt */}
              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Vertical Tilt:</span>
                  <span className="font-mono text-[#C89211] font-bold">{rotateX}°</span>
                </div>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  value={rotateX}
                  onChange={e => setRotateX(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              {/* Door Open Swing Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span className="flex items-center gap-1">
                    <DoorOpen className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>Door Open Angle:</span>
                  </span>
                  <span className="font-mono text-[#C89211] font-bold">{doorOpenAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={doorOpenAngle}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setDoorOpenAngle(val);
                    if (onUpdateFittingState) onUpdateFittingState({ doorOpenAngle: val });
                  }}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              {/* 360° Auto-Tour Toggle */}
              <div className="space-y-1">
                <span className="text-[#1A1A1A] font-medium block">360° Continuous Tour:</span>
                <button
                  type="button"
                  onClick={() => setAutoRotate360(!autoRotate360)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    autoRotate360
                      ? 'bg-[#C89211] text-white border-[#C89211] font-bold ring-1 ring-[#C89211]'
                      : 'bg-white hover:bg-stone-50 text-[#1A1A1A] border-[#E5E5E5]'
                  }`}
                >
                  {autoRotate360 ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{autoRotate360 ? 'Pause Auto 360°' : 'Start Auto 360°'}</span>
                </button>
              </div>
            </div>

            {/* Quick Angle Orbit Presets */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-[#666666] text-[11px] font-semibold">Orbit Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(0)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  Math.abs(rotateY) <= 10 && rotateX === 0 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Front (0°)
              </button>

              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(-90)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  Math.abs(rotateY - -90) <= 10 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Left Side (-90°)
              </button>

              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(180)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  Math.abs(Math.abs(rotateY) - 180) <= 10 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Back View (180°)
              </button>

              <button
                type="button"
                onClick={() => handleApplyOrbitPreset(90)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  Math.abs(rotateY - 90) <= 10 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Right Side (+90°)
              </button>

              <span className="text-stone-300 mx-1">•</span>

              <span className="text-[#666666] text-[11px] font-semibold">Door Opening:</span>
              <button
                type="button"
                onClick={() => {
                  setDoorOpenAngle(0);
                  if (onUpdateFittingState) onUpdateFittingState({ doorOpenAngle: 0 });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  doorOpenAngle === 0 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Closed (0°)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDoorOpenAngle(45);
                  if (onUpdateFittingState) onUpdateFittingState({ doorOpenAngle: 45 });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  doorOpenAngle === 45 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Half (45°)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDoorOpenAngle(85);
                  if (onUpdateFittingState) onUpdateFittingState({ doorOpenAngle: 85 });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  doorOpenAngle === 85 ? 'bg-[#C89211] text-white border-[#C89211]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                Full Open (85°)
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className="ml-auto px-3 py-1 rounded-lg bg-white hover:bg-stone-50 text-[#C89211] text-xs font-bold border border-[#C89211]/40 transition cursor-pointer shadow-sm"
              >
                Reset View
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Switch Catalogue Designs Carousel */}
        {activeTab === 'designs' && allDoors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#666666]">
              <span>Select any catalogue door to preview live in 3D:</span>
              <span className="font-semibold text-[#C89211]">{allDoors.length} designs available</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {allDoors.map(d => {
                const isSelected = d.id === door.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      if (onSelectDoor) onSelectDoor(d);
                    }}
                    className={`flex-shrink-0 w-32 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF7E3] border-[#C89211] ring-2 ring-[#C89211]/30'
                        : 'bg-white border-[#E5E5E5] hover:border-stone-400'
                    }`}
                  >
                    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#F8F8F6] mb-1.5 relative border border-[#E5E5E5]">
                      <img
                        src={d.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                        alt={d.name}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-[#C89211] text-white p-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-[#1A1A1A] line-clamp-1">
                      {d.name}
                    </div>
                    <div className="text-[10px] text-[#C89211] font-mono font-semibold">
                      ₹{d.startingPrice.toLocaleString('en-IN')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
