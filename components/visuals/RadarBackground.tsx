"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function RadarBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth < 768) return;

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return;
    } catch {
      return;
    }

    if (!mountRef.current) return;
    const mount = mountRef.current;

    const scene = new THREE.Scene();
    
    const camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1,
      1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const circleMaterial = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.05,
    });

    const segments = 64;
    const ringGeometries: THREE.BufferGeometry[] = [];
    for (let i = 1; i <= 5; i++) {
      const radius = i * 200;
      const geometry = new THREE.BufferGeometry();
      ringGeometries.push(geometry);
      const points = [];
      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
      }
      geometry.setFromPoints(points);
      const circle = new THREE.Line(geometry, circleMaterial);
      group.add(circle);
    }

    const sweepMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
    });

    const sweepGeometry = new THREE.CircleGeometry(1000, 32, 0, Math.PI / 4);
    const sweep = new THREE.Mesh(sweepGeometry, sweepMaterial);
    group.add(sweep);

    group.position.set(0, 0, 0);

    let animationFrameId: number;
    let rotation = 0;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      rotation -= 0.01;
      sweep.rotation.z = rotation;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.left = window.innerWidth / -2;
      camera.right = window.innerWidth / 2;
      camera.top = window.innerHeight / 2;
      camera.bottom = window.innerHeight / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sweepMaterial.dispose();
      sweepGeometry.dispose();
      circleMaterial.dispose();
      ringGeometries.forEach((geometry) => geometry.dispose());
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10 pointer-events-none opacity-30 mix-blend-screen"
    />
  );
}
