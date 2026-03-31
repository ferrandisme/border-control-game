"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { type Decision } from "@/lib/game-state";

type DecisionStampProps = {
  decision: Decision;
  className?: string;
};

export function DecisionStamp({ decision, className }: DecisionStampProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        return;
      }
    } catch {
      return;
    }

    if (!mountRef.current) return;
    const mount = mountRef.current;
    const getViewportSize = () => {
      const bounds = mount.getBoundingClientRect();
      return {
        width: Math.max(bounds.width || mount.clientWidth, 1),
        height: Math.max(bounds.height || mount.clientHeight, 1),
      };
    };
    const initialSize = getViewportSize();
    const aspect = initialSize.width / initialSize.height;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    let currentBaseScale = Math.min(0.7, Math.max(0.01, initialSize.width / 520));

    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.1,
      100
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(initialSize.width, initialSize.height, false);
    renderer.setPixelRatio(pixelRatio);
    mount.appendChild(renderer.domElement);
    
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = Math.max(Math.round(initialSize.width * pixelRatio), 1);
    textureCanvas.height = Math.max(Math.round(initialSize.height * pixelRatio), 1);
    const ctx = textureCanvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const logicalWidth = textureCanvas.width / pixelRatio;
      const logicalHeight = textureCanvas.height / pixelRatio;
      const padding = Math.max(14, logicalWidth * 0.07);
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
      ctx.strokeStyle = decision === "approve" ? "#22c55e" : "#ef4444";
      ctx.lineWidth = Math.max(10, logicalWidth * 0.025);
      ctx.strokeRect(padding, padding, logicalWidth - padding * 2, logicalHeight - padding * 2);
      
      ctx.fillStyle = decision === "approve" ? "#22c55e" : "#ef4444";
      ctx.font = `bold ${Math.max(32, logicalWidth * 0.13)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(decision === "approve" ? "AUTORIZADO" : "DENEGADO", logicalWidth / 2, logicalHeight / 2);
    }
    const texture = new THREE.CanvasTexture(textureCanvas);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
    });
    const geometry = new THREE.PlaneGeometry(Math.max(1.4, aspect * 1.05), 1.05);
    const stamp = new THREE.Mesh(geometry, material);
    
    const bgGeometry = new THREE.PlaneGeometry(aspect * 10, 10);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: decision === "approve" ? 0x22c55e : 0xef4444,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -1;
    scene.add(bgMesh);

    stamp.position.set(0, 0, 0.35);
    stamp.scale.set(currentBaseScale * 1.5, currentBaseScale * 1.5, currentBaseScale * 1.5);
    const baseRotation = (Math.random() - 0.5) * 0.3;
    stamp.rotation.z = baseRotation;
    scene.add(stamp);

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 1500;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (decision === "approve") {
        if (progress < 0.2) {
          const p = progress / 0.2;
          const scale = (currentBaseScale * 1.5) + (1.0 * (1 - p));
          stamp.scale.set(scale, scale, scale);
          stamp.position.z = 1.0 - p * 0.65;
          material.opacity = p;
          bgMaterial.opacity = p * 0.4;
        } else if (progress < 0.8) {
          stamp.scale.set(currentBaseScale * 1.5, currentBaseScale * 1.5, currentBaseScale * 1.5);
          stamp.position.z = 0.35;
          material.opacity = 1;
          bgMaterial.opacity = 0.4 * (1 - (progress - 0.2) / 0.6);
        } else {
          const p = (progress - 0.8) / 0.2;
          material.opacity = 1 - p;
          const scale = (currentBaseScale * 1.5) + p * 0.2;
          stamp.scale.set(scale, scale, scale);
        }
      } else {
        if (progress < 0.1) {
          const p = progress / 0.1;
          const scale = (currentBaseScale * 1.5) + (2.5 * (1 - p));
          stamp.scale.set(scale, scale, scale);
          stamp.position.z = 2.0 - p * 1.65;
          material.opacity = p;
          bgMaterial.opacity = p * 0.6;
        } else if (progress < 0.8) {
          stamp.scale.set(currentBaseScale * 1.5, currentBaseScale * 1.5, currentBaseScale * 1.5);
          stamp.position.z = 0.35;
          material.opacity = 1;
          bgMaterial.opacity = 0.6 * (1 - (progress - 0.1) / 0.7);
          
          const shakeAmount = Math.max(0, 1 - (progress - 0.1) * 3) * 0.2;
          camera.position.x = (Math.random() - 0.5) * shakeAmount;
          camera.position.y = (Math.random() - 0.5) * shakeAmount;
        } else {
          camera.position.set(0, 0, 5);
          const p = (progress - 0.8) / 0.2;
          material.opacity = 1 - p;
          stamp.scale.set(currentBaseScale * 1.5, currentBaseScale * 1.5, currentBaseScale * 1.5);
        }
      }

      renderer.render(scene, camera);

      if (progress >= 1) {
        cancelAnimationFrame(animationFrameId);
        return;
      }
    };
    animate();

    const handleResize = () => {
      const nextSize = getViewportSize();
      const nextAspect = nextSize.width / nextSize.height;
      currentBaseScale = Math.min(0.7, Math.max(0.01, nextSize.width / 520));
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(nextSize.width, nextSize.height, false);
      stamp.scale.set(currentBaseScale, currentBaseScale, currentBaseScale);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      bgMaterial.dispose();
      bgGeometry.dispose();
      material.dispose();
      geometry.dispose();
      texture.dispose();
    };
  }, [decision]);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${className ?? ''}`.trim()}
    />
  );
}
