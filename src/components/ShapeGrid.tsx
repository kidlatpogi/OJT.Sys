'use client';

import React, { useEffect, useRef } from 'react';

interface ShapeGridProps {
  squareSize?: number;
  borderColor?: string;
  hoverFillColor?: string;
  gradientColor?: string;
}

export default function ShapeGrid({
  squareSize = 52,
  borderColor = 'rgba(148, 163, 184, 0.22)',
  hoverFillColor = 'rgba(196, 73, 0, 0.08)',
  gradientColor = '#f8f8f8',
}: ShapeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let hovered: { x: number; y: number } | null = null;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let x = 0; x < canvas.width + squareSize; x += squareSize) {
        for (let y = 0; y < canvas.height + squareSize; y += squareSize) {
          const gx = Math.floor(x / squareSize);
          const gy = Math.floor(y / squareSize);

          if (hovered && hovered.x === gx && hovered.y === gy) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(x, y, squareSize, squareSize);
          }

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, squareSize, squareSize);
        }
      }

      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.72
      );
      grad.addColorStop(0, 'rgba(248, 248, 248, 0.05)');
      grad.addColorStop(1, gradientColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nextX = Math.floor(mx / squareSize);
      const nextY = Math.floor(my / squareSize);

      if (!hovered || hovered.x !== nextX || hovered.y !== nextY) {
        hovered = { x: nextX, y: nextY };
        draw();
      }
    };

    const handleLeave = () => {
      if (hovered !== null) {
        hovered = null;
        draw();
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, [squareSize, borderColor, hoverFillColor, gradientColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
