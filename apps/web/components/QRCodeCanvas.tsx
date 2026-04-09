"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

type Props = {
  url: string;
  size?: number;
};

export function QRCodeCanvas({ url, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;
    void QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: { dark: "#0b1828", light: "#ffffff" },
    });
  }, [url, size]);

  return <canvas ref={canvasRef} style={{ borderRadius: 8, display: "block" }} />;
}
