import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as THREE from 'three';

export default function FlikBrain() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0.4, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasRef.current });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const key = new THREE.PointLight(0xffffff, 1.0);
    key.position.set(5, 6, 6);
    scene.add(key);
    
    const fill = new THREE.PointLight(0xff4500, 0.6);
    fill.position.set(-5, -4, -3);
    scene.add(fill);
    
    scene.add(new THREE.AmbientLight(0xff6a00, 0.3));

    // Groups
    const outerGroup = new THREE.Group();
    scene.add(outerGroup);
    
    const innerGroup = new THREE.Group();
    innerGroup.visible = false;
    scene.add(innerGroup);

    // Outer Web (nodes + edges)
    const RADIUS = 1.5;
    const NODE_COUNT = 260;
    const K_NEIGHBORS = 6;
    const nodeVecs = [];
    const nodePositions = [];
    
    for (let i = 0; i < NODE_COUNT; i++) {
      const t = i / NODE_COUNT;
      const inc = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - 2 * t;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * inc;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;
      const v = new THREE.Vector3(x, y, z).multiplyScalar(RADIUS);
      nodeVecs.push(v);
      nodePositions.push(v.x, v.y, v.z);
    }

    // Node texture
    const makeNodeTexture = (size = 64) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(255,69,0,1)');
      gradient.addColorStop(0.5, 'rgba(255,120,71,0.85)');
      gradient.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      return new THREE.CanvasTexture(canvas);
    };
    
    const nodeTexture = makeNodeTexture();
    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    const nodesMat = new THREE.PointsMaterial({
      size: 0.06,
      map: nodeTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const nodes = new THREE.Points(nodesGeo, nodesMat);
    outerGroup.add(nodes);

    // Edges
    const edgesGeo = new THREE.BufferGeometry();
    const edgePositions = [];
    const neighbors = Array.from({ length: NODE_COUNT }, () => []);
    const seen = new Set();
    
    for (let i = 0; i < NODE_COUNT; i++) {
      const distances = [];
      for (let j = 0; j < NODE_COUNT; j++) {
        if (i !== j) distances.push({ j, d: nodeVecs[i].distanceTo(nodeVecs[j]) });
      }
      distances.sort((a, b) => a.d - b.d);
      
      for (let k = 0; k < K_NEIGHBORS; k++) {
        const j = distances[k].j;
        if (neighbors[i].length < K_NEIGHBORS) neighbors[i].push(j);
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = nodeVecs[i], b = nodeVecs[j];
        edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    
    edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.28 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    outerGroup.add(edges);

    // Core shell
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0xff4500,
        emissive: 0xff2400,
        emissiveIntensity: 2.4,
        roughness: 0.25,
        metalness: 0.25
      })
    );
    scene.add(core);

    // Edge beams
    let coreFlash = 0;
    const MAX_EDGE_BEAMS = 200;
    const edgeBeams = [];
    const edgeBeamGeom = new THREE.SphereGeometry(0.035, 10, 10);
    const edgeBeamMat = new THREE.MeshBasicMaterial({ color: 0xffe7c2 });
    
    const spawnEdgeBeam = (i) => {
      const nbrs = neighbors[i];
      if (!nbrs.length) return;
      const j = nbrs[Math.floor(Math.random() * nbrs.length)];
      const obj = new THREE.Mesh(edgeBeamGeom, edgeBeamMat.clone());
      obj.position.copy(nodeVecs[i]);
      outerGroup.add(obj);
      const speed = 0.6 + Math.random() * 0.9;
      edgeBeams.push({ mesh: obj, from: i, to: j, t: 0, speed });
      if (edgeBeams.length > MAX_EDGE_BEAMS) {
        const old = edgeBeams.shift();
        outerGroup.remove(old.mesh);
      }
    };
    
    const edgeBeamInterval = setInterval(() => {
      for (let c = 0; c < 4; c++) spawnEdgeBeam(Math.floor(Math.random() * NODE_COUNT));
    }, 280);

    // Core pulses
    const corePulses = [];
    const corePulseGeom = new THREE.SphereGeometry(0.045, 10, 10);
    const corePulseMat = new THREE.MeshBasicMaterial({ color: 0xffa07a });
    
    const spawnCorePulse = (i) => {
      const m = new THREE.Mesh(corePulseGeom, corePulseMat.clone());
      m.position.copy(nodeVecs[i]);
      scene.add(m);
      const speed = 0.9 + Math.random() * 0.8;
      corePulses.push({ mesh: m, start: nodeVecs[i].clone(), t: 0, speed });
    };
    
    const corePulseInterval = setInterval(() => {
      const i = Math.floor(Math.random() * NODE_COUNT);
      spawnCorePulse(i);
    }, 900);

    // Inside visuals
    const innerRings = new THREE.Group();
    innerGroup.add(innerRings);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff7a39, transparent: true, opacity: 0.25, wireframe: true });
    
    for (let r = 0.15; r <= 0.45; r += 0.06) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0035, 12, 96), ringMat.clone());
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      innerRings.add(ring);
    }

    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.9, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc7a1, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    innerGroup.add(stream);

    // Spark particles
    const SPARKS = 350;
    const sparkPos = new Float32Array(SPARKS * 3);
    const sparkVel = new Float32Array(SPARKS);
    
    for (let i = 0; i < SPARKS; i++) {
      const r = Math.random() * 0.48;
      const ang = Math.random() * Math.PI * 2;
      sparkPos[i * 3 + 0] = Math.cos(ang) * r * 0.8;
      sparkPos[i * 3 + 1] = (Math.random() * 2 - 1) * 0.35;
      sparkPos[i * 3 + 2] = Math.sin(ang) * r * 0.8;
      sparkVel[i] = 0.25 + Math.random() * 0.6;
    }
    
    const sparksGeo = new THREE.BufferGeometry();
    sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkTex = makeNodeTexture(32);
    const sparksMat = new THREE.PointsMaterial({
      size: 0.035,
      map: sparkTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffe0c9
    });
    const sparks = new THREE.Points(sparksGeo, sparksMat);
    innerGroup.add(sparks);

    // Controls
    let rotating = false, panning = false;
    let lastX = 0, lastY = 0;
    let targetZ = camera.position.z;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const onDown = (e) => {
      const btn = e.touches ? 0 : e.button;
      if (btn === 0) rotating = true;
      else if (btn === 2) panning = true;
      lastX = e.touches ? e.touches[0].clientX : e.clientX;
      lastY = e.touches ? e.touches[0].clientY : e.clientY;
    };

    const onMove = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = x - lastX, dy = y - lastY;
      lastX = x;
      lastY = y;
      if (rotating) {
        outerGroup.rotation.y += dx * 0.005;
        outerGroup.rotation.x += dy * 0.005;
      } else if (panning) {
        camera.position.x -= dx * 0.005;
        camera.position.y += dy * 0.005;
      }
    };

    const onUp = () => {
      rotating = false;
      panning = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      targetZ = clamp(camera.position.z + Math.sign(e.deltaY) * 0.5, 1.2, 30);
    };

    let pinchStart = 0;
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (!pinchStart) pinchStart = dist;
        else {
          const scale = pinchStart / dist;
          targetZ = clamp(camera.position.z * scale, 1.2, 30);
          pinchStart = dist;
        }
      } else {
        onMove(e);
      }
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: true });
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Camera transitions
    let mode = 'outside';
    let tCam = 0;
    const startOutside = new THREE.Vector3(0, 0.6, 6.5);
    const endInside = new THREE.Vector3(0, 0.0, 0.35);
    const lookAtCore = new THREE.Vector3(0, 0, 0);

    const startEnter = () => {
      if (mode !== 'outside') return;
      mode = 'transitionIn';
      tCam = 0;
    };

    const startExit = () => {
      if (mode !== 'inside') return;
      mode = 'transitionOut';
      tCam = 0;
    };



    const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    const updateCameraTransition = (dt) => {
      const DURATION = 1.2;
      if (mode === 'transitionIn') {
        tCam = Math.min(1, tCam + dt / DURATION);
        const k = easeInOutCubic(tCam);
        camera.position.copy(startOutside).lerp(endInside, k);
        camera.lookAt(lookAtCore);
        if (tCam >= 1) {
          mode = 'inside';
          outerGroup.visible = false;
          innerGroup.visible = true;
          core.visible = false;
        }
      } else if (mode === 'transitionOut') {
        tCam = Math.min(1, tCam + dt / DURATION);
        const k = easeInOutCubic(tCam);
        camera.position.copy(endInside).lerp(startOutside, k);
        camera.lookAt(lookAtCore);
        if (tCam >= 1) {
          mode = 'outside';
          outerGroup.visible = true;
          innerGroup.visible = false;
          core.visible = true;
        }
      }
    };

    // Animate
    const clock = new THREE.Clock();
    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      // Outside visuals
      if (mode === 'outside' || mode === 'transitionIn') {
        outerGroup.rotation.y += 0.0012;
        outerGroup.rotation.x += 0.0006;
        nodesMat.size = 0.06 + 0.01 * Math.sin(t * 1.2);

        // Edge beams
        for (let k = edgeBeams.length - 1; k >= 0; k--) {
          const b = edgeBeams[k];
          b.t += b.speed * 0.008;
          const from = nodeVecs[b.from];
          const to = nodeVecs[b.to];
          const pos = new THREE.Vector3().copy(from).lerp(to, Math.min(1, b.t));
          b.mesh.position.copy(pos);
          b.mesh.material.opacity = 0.9 - 0.8 * Math.min(1, b.t);
          if (b.t >= 1) {
            outerGroup.remove(b.mesh);
            edgeBeams.splice(k, 1);
          }
        }

        // Core pulses
        for (let p = corePulses.length - 1; p >= 0; p--) {
          const cp = corePulses[p];
          cp.t += cp.speed * 0.01;
          const pos = cp.start.clone().lerp(new THREE.Vector3(0, 0, 0), Math.min(1, cp.t));
          cp.mesh.position.copy(pos);
          if (cp.t >= 1) {
            scene.remove(cp.mesh);
            coreFlash = 1;
            corePulses.splice(p, 1);
          }
        }

        if (coreFlash > 0) coreFlash = Math.max(0, coreFlash - 0.05);
        const baseColor = new THREE.Color(0xff4500);
        const hotColor = new THREE.Color(0xff2400);
        core.material.emissiveIntensity = 2.4 + 1.5 * coreFlash;
        core.material.emissive = baseColor.clone().lerp(hotColor, coreFlash);
        core.material.color = baseColor.clone().lerp(hotColor, coreFlash * 0.5);
      }

      // Inside visuals
      if (mode === 'inside' || mode === 'transitionOut') {
        innerRings.rotation.x += 0.0025;
        innerRings.rotation.y += 0.0017;

        const posAttr = sparks.geometry.attributes.position;
        for (let i = 0; i < SPARKS; i++) {
          let y = posAttr.array[i * 3 + 1];
          y += sparkVel[i] * dt * 0.6;
          if (y > 0.45) y = -0.45;
          posAttr.array[i * 3 + 1] = y;
        }
        posAttr.needsUpdate = true;
        stream.material.opacity = 0.12 + 0.05 * Math.sin(t * 1.5);
      }

      // Camera transitions
      if (mode === 'transitionIn' || mode === 'transitionOut') updateCameraTransition(dt);

      camera.position.z += (targetZ - camera.position.z) * 0.15;
      renderer.render(scene, camera);
      
      return animationId;
    };

    const animationId = animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(edgeBeamInterval);
      clearInterval(corePulseInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onUp);
      canvas.removeEventListener('wheel', onWheel);
      
      // Dispose Three.js resources
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0" />
      
      {/* HUD */}
      <div className="fixed left-3 bottom-3 text-[#ffd5c6] text-xs leading-relaxed bg-[rgba(30,0,0,0.35)] px-2 py-1.5 rounded-lg backdrop-blur-sm font-sans">
        LMB drag: rotate • RMB drag: pan • wheel/pinch: zoom
      </div>

      {/* Back button */}
      <Button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm"
        size="icon"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Title */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF6B35] via-[#F72C25] to-[#FFB800] bg-clip-text text-transparent drop-shadow-lg">
          FLIK's Brain
        </h1>
      </div>
    </div>
  );
}