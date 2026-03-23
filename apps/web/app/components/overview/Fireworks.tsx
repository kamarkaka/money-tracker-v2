"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
  exploded: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

const COLORS = [
  "#ff4757", "#ff6b81", "#ffa502", "#ffda79",
  "#2ed573", "#7bed9f", "#1e90ff", "#70a1ff",
  "#a855f7", "#c084fc", "#ff6348", "#eccc68",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function Fireworks({ duration = 3000 }: { duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];
    const startTime = Date.now();
    let lastRocket = 0;
    let animId: number;

    function spawnRocket() {
      const x = w * 0.15 + Math.random() * w * 0.7;
      const targetY = h * 0.15 + Math.random() * h * 0.35;
      // Calculate velocity needed to reach target with gravity
      // Using v² = 2 * g * distance, with some extra boost
      const distance = h - targetY;
      const speed = Math.sqrt(2 * 0.06 * distance) + 1;
      rockets.push({
        x,
        y: h,
        vy: -speed,
        targetY,
        color: randomColor(),
        exploded: false,
        trail: [],
      });
    }

    function explode(rocket: Rocket) {
      const count = 40 + Math.floor(Math.random() * 30);
      const baseColor = rocket.color;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 1.5 + Math.random() * 3.5;
        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.3 ? baseColor : randomColor(),
          life: 0,
          maxLife: 50 + Math.random() * 40,
          size: 2 + Math.random() * 2,
        });
      }
    }

    function draw() {
      const elapsed = Date.now() - startTime;
      ctx!.clearRect(0, 0, w, h);

      // Spawn rockets in the first portion of duration
      if (elapsed < duration * 0.7 && elapsed - lastRocket > 200 + Math.random() * 300) {
        spawnRocket();
        lastRocket = elapsed;
      }

      // Update rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (!r.exploded) {
          r.trail.push({ x: r.x, y: r.y, alpha: 1 });
          if (r.trail.length > 8) r.trail.shift();
          r.y += r.vy;
          r.vy += 0.06; // gravity on rocket

          // Draw trail
          for (let j = 0; j < r.trail.length; j++) {
            const t = r.trail[j];
            t.alpha -= 0.12;
            ctx!.beginPath();
            ctx!.arc(t.x, t.y, 2, 0, Math.PI * 2);
            ctx!.fillStyle = r.color + Math.round(Math.max(0, t.alpha) * 255).toString(16).padStart(2, "0");
            ctx!.fill();
          }

          // Draw rocket head
          ctx!.beginPath();
          ctx!.arc(r.x, r.y, 3, 0, Math.PI * 2);
          ctx!.fillStyle = r.color;
          ctx!.fill();

          if (r.y <= r.targetY || r.vy >= 0) {
            r.exploded = true;
            explode(r);
          }
        } else {
          // Remove exploded rockets after trail fades
          if (r.trail.every((t) => t.alpha <= 0)) {
            rockets.splice(i, 1);
          } else {
            for (const t of r.trail) {
              t.alpha -= 0.1;
            }
          }
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.vx *= 0.985; // drag
        p.vy *= 0.985;
        p.life++;

        const progress = p.life / p.maxLife;
        const alpha = 1 - progress;

        if (alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx!.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx!.fill();
      }

      // Continue animation if there are still particles/rockets or within duration
      if (elapsed < duration || particles.length > 0 || rockets.length > 0) {
        animId = requestAnimationFrame(draw);
      }
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [duration]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
