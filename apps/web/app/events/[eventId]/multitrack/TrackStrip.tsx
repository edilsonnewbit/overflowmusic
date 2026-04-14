"use client";

import { useEffect, useRef } from "react";
import type { TrackState } from "./useMultitrackEngine";

const TRACK_ICONS: Record<string, string> = {
  CLICK: "🥁",
  GUIDE_VOCAL: "🎤",
  FULL_BAND: "🎵",
  PAD: "🎹",
  BASS: "🎸",
  STEM_KEYS: "🎹",
  STEM_GUITAR: "🎸",
  STEM_DRUMS: "🥁",
  STEM_BACKING: "🎵",
};

const TRACK_COLORS: Record<string, string> = {
  CLICK: "#ef4444",
  GUIDE_VOCAL: "#f59e0b",
  FULL_BAND: "#7cf2a2",
  PAD: "#818cf8",
  BASS: "#06b6d4",
  STEM_KEYS: "#a78bfa",
  STEM_GUITAR: "#fb923c",
  STEM_DRUMS: "#f87171",
  STEM_BACKING: "#94a3b8",
};

type Props = {
  track: TrackState;
  isPlaying: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
};

export function TrackStrip({ track, isPlaying, onVolumeChange, onMuteToggle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const color = TRACK_COLORS[track.trackType] ?? "#94a3b8";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !track.analyserNode || track.loadState !== "ready") return;

    const analyser = track.analyserNode;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      if (!ctx || !canvas) return;
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#0b1623";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = track.muted ? "#334155" : color;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    if (isPlaying) draw();
    else {
      // Draw flat line when paused
      cancelAnimationFrame(rafRef.current);
      ctx.fillStyle = "#0b1623";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = track.muted ? "#1e293b" : color + "55";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, track.analyserNode, track.loadState, track.muted, color]);

  const icon = TRACK_ICONS[track.trackType] ?? "🎵";

  return (
    <div className={`mt-track-strip${track.muted ? " muted" : ""}${track.loadState === "error" ? " error" : ""}`}>
      {/* Left: label + mute */}
      <div className="mt-track-label">
        <button
          type="button"
          className={`mt-mute-btn${track.muted ? " active" : ""}`}
          onClick={onMuteToggle}
          title={track.muted ? "Ativar" : "Mutar"}
          style={{ borderColor: color }}
        >
          {icon}
        </button>
        <span className="mt-track-name" style={{ color: track.muted ? "#475569" : color }}>
          {track.label}
        </span>
      </div>

      {/* Center: waveform */}
      <div className="mt-track-wave">
        {track.loadState === "loading" && (
          <div className="mt-track-loading">carregando...</div>
        )}
        {track.loadState === "error" && (
          <div className="mt-track-error">erro ao carregar</div>
        )}
        {(track.loadState === "ready" || track.loadState === "idle") && (
          <canvas ref={canvasRef} className="mt-waveform-canvas" />
        )}
      </div>

      {/* Right: fader */}
      <div className="mt-fader-wrap">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="mt-fader"
          style={{ "--fader-color": color } as React.CSSProperties}
          title={`Volume: ${Math.round(track.volume * 100)}%`}
        />
        <span className="mt-fader-val">{Math.round(track.volume * 100)}</span>
      </div>
    </div>
  );
}
