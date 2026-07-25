"use client";

import { useRef, useEffect, useCallback } from "react";

interface AsciiRevealProps {
  image: string;
  columns?: number;
  contrast?: number;
  colorMode?: "mono" | "color" | "green" | "amber";
  inkColor?: string;
  invert?: boolean;
  charset?: string;
  reveal?: boolean;
  revealOptions?: { size?: number; softness?: number };
  style?: React.CSSProperties;
  className?: string;
}

const PALETTES: Record<string, string[]> = {
  mono: ["#e8dcc8"],
  green: ["#00ff41", "#00cc33", "#009922"],
  amber: ["#ffb000", "#ff8c00", "#cc7000"],
};

function grayscale(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function AsciiReveal(props: AsciiRevealProps) {
  const {
    image,
    columns = 100,
    contrast = 100,
    colorMode = "mono",
    inkColor,
    invert = false,
    charset = " .:-=+*#%@",
    reveal = false,
    revealOptions = { size: 60, softness: 12 },
    style,
    className,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const frameRef = useRef<number>(0);
  const dataRef = useRef<{
    chars: string[];
    colors: string[];
    w: number;
    h: number;
    cellW: number;
    cellH: number;
  } | null>(null);
  const imgLoadedRef = useRef(false);

  const buildAscii = useCallback(
    (img: HTMLImageElement, cvs: HTMLCanvasElement) => {
      const ctx = cvs.getContext("2d")!;
      const aspect = 0.55;
      const cellW = cvs.width / columns;
      const cellH = cellW * aspect;
      const rows = Math.floor(cvs.height / cellH);
      const offscreen = document.createElement("canvas");
      offscreen.width = columns;
      offscreen.height = rows;
      const offCtx = offscreen.getContext("2d")!;
      offCtx.drawImage(img, 0, 0, columns, rows);
      const imgData = offCtx.getImageData(0, 0, columns, rows).data;
      const palette = PALETTES[colorMode] || PALETTES.mono;
      const chars: string[] = [];
      const colors: string[] = [];
      const factor = (contrast / 100) * 2;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const i = (y * columns + x) * 4;
          let lum = grayscale(imgData[i], imgData[i + 1], imgData[i + 2]);
          if (invert) lum = 255 - lum;
          lum = Math.min(255, Math.max(0, lum * factor));
          const idx = Math.floor((lum / 255) * (charset.length - 1));
          chars.push(charset[idx]);
          if (colorMode === "color") {
            colors.push(
              `rgb(${imgData[i]},${imgData[i + 1]},${imgData[i + 2]})`
            );
          } else {
            colors.push(palette[0]);
          }
        }
      }
      dataRef.current = { chars, colors, w: columns, h: rows, cellW, cellH };
      imgLoadedRef.current = true;
    },
    [columns, contrast, colorMode, invert, charset]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dataRef.current) return;
    const ctx = canvas.getContext("2d")!;
    const { chars, colors, w, h, cellW, cellH } = dataRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${cellW * 0.85}px "Courier New", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const rSize = revealOptions.size ?? 60;
    const rSoft = revealOptions.softness ?? 12;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const cx = x * cellW + cellW / 2;
        const cy = y * cellH + cellH / 2;
        if (reveal) {
          const dist = Math.hypot(mx - cx, my - cy);
          const edge0 = Math.max(0, rSize - rSoft);
          const alpha =
            dist < edge0
              ? 1
              : dist < rSize
                ? 1 - (dist - edge0) / (rSize - edge0)
                : 0;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
        } else {
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = colors[idx];
        ctx.fillText(chars[idx], cx, cy);
      }
    }
    ctx.globalAlpha = 1;
    frameRef.current = requestAnimationFrame(render);
  }, [reveal, revealOptions.size, revealOptions.softness]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cvs = canvas;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cvs.width = cvs.clientWidth * (window.devicePixelRatio || 1);
      cvs.height = cvs.clientHeight * (window.devicePixelRatio || 1);
      const ctx = cvs.getContext("2d")!;
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      buildAscii(img, cvs);
      frameRef.current = requestAnimationFrame(render);
    };
    img.src = image;

    const onMouse = (e: MouseEvent) => {
      const rect = cvs.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    cvs.addEventListener("mousemove", onMouse);
    cvs.addEventListener("mouseleave", onLeave);
    const onResize = () => {
      if (imgLoadedRef.current) {
        cvs.width = cvs.clientWidth * (window.devicePixelRatio || 1);
        cvs.height = cvs.clientHeight * (window.devicePixelRatio || 1);
        const ctx = cvs.getContext("2d")!;
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        buildAscii(img, cvs);
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frameRef.current);
      cvs.removeEventListener("mousemove", onMouse);
      cvs.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [image, buildAscii, render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
        cursor: reveal ? "none" : "default",
        ...style,
      }}
    />
  );
}
