import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const LIGHTING_ANGLES = [
  {
    id: "top",
    label: "Top",
    prompt: "Apply top-down lighting to this image, create dramatic shadows under features, studio-style overhead light, emphasize depth and contours"
  },
  {
    id: "front",
    label: "Front",
    prompt: "Apply even front lighting to this image, flattering soft light from the front, minimal harsh shadows, perfectly balanced illumination"
  },
  {
    id: "right",
    label: "Right",
    prompt: "Apply right-side lighting to this image, strong light from the right, emphasize texture and depth, create modeling shadows on the left"
  },
  {
    id: "left",
    label: "Left",
    prompt: "Apply left-side lighting to this image, strong light from the left, emphasize texture and dimension, create shadows on the right side"
  },
  {
    id: "back",
    label: "Back",
    prompt: "Apply backlit effect to this image, rim lighting around the edges, subject glowing against darker background, dramatic separation from background"
  },
  {
    id: "bottom",
    label: "Bottom",
    prompt: "Apply bottom-up lighting to this image, dramatic uplighting effect, create moody atmospheric shadows, theatrical lighting style"
  }
];

export default function Lighting3DInteractive({ onSelect }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const lightPosRef = useRef(new THREE.Vector3(0, 1, 2));
  const [isDragging, setIsDragging] = useState(false);
  const [raycaster] = useState(new THREE.Raycaster());
  const [mouse] = useState(new THREE.Vector2());

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 4;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Wireframe sphere
    const sphereGeometry = new THREE.IcosahedronGeometry(1.5, 4);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
    const wireframeGeometry = new THREE.WireframeGeometry(sphereGeometry);
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    // Light source indicator (small sphere)
    const lightGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xFFB800 });
    const lightSphere = new THREE.Mesh(lightGeometry, lightMaterial);
    scene.add(lightSphere);

    // Light cone (spotlight helper)
    const coneGeometry = new THREE.ConeGeometry(0.8, 2, 32);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6B35,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    scene.add(cone);

    // Ambient light for visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update light source position
      lightSphere.position.copy(lightPosRef.current);
      
      // Update cone to point from light towards center
      cone.position.copy(lightPosRef.current);
      cone.lookAt(new THREE.Vector3(0, 0, 0));

      renderer.render(scene, camera);
    };
    animate();

    // Mouse interaction
    const handleMouseMove = (event) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      
      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.5);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectSphere(sphere, intersectPoint);
      
      if (intersectPoint) {
        lightPosRef.current.copy(intersectPoint);
      }
    };

    const onMouseDown = (event) => {
      setIsDragging(true);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      const prompt = getPromptFromPosition(lightPosRef.current);
      onSelect({
        id: "lighting",
        label: "Fix Lighting",
        prompt,
        selectedAngle: "custom"
      });
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("touchstart", onMouseDown);
    renderer.domElement.addEventListener("touchmove", handleMouseMove);
    renderer.domElement.addEventListener("touchend", onMouseUp);

    // Handle window resize
    const onWindowResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("touchstart", onMouseDown);
      renderer.domElement.removeEventListener("touchmove", handleMouseMove);
      renderer.domElement.removeEventListener("touchend", onMouseUp);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [isDragging, onSelect]);

  const getPromptFromPosition = (pos) => {
    const angle = Math.atan2(pos.x, pos.z) * (180 / Math.PI);
    const elevation = Math.atan2(pos.y, new THREE.Vector2(pos.x, pos.z).length()) * (180 / Math.PI);

    if (elevation > 45) return LIGHTING_ANGLES[0].prompt; // Top
    if (elevation < -45) return LIGHTING_ANGLES[5].prompt; // Bottom
    if (angle > -45 && angle < 45) return LIGHTING_ANGLES[1].prompt; // Front
    if (angle >= 45 && angle < 135) return LIGHTING_ANGLES[2].prompt; // Right
    if (angle >= 135 || angle < -135) return LIGHTING_ANGLES[4].prompt; // Back
    return LIGHTING_ANGLES[3].prompt; // Left
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-2xl bg-black cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
    />
  );
}