"use client";

import { useEffect, useRef } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  songTitle: string;
  songKey: string | null;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
};

export function TransportBar({
  isPlaying, isLoading, currentTime, duration,
  songTitle, songKey,
  onPlay, onPause, onSeek, onPrev, onNext, hasPrev, hasNext,
}: Props) {
  const rangeRef       = useRef<HTMLInputElement>(null);
  const fillRef        = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLSpanElement>(null);
  const isDragging     = useRef(false);

  // Update scrubber + fill + time display imperatively (no re-render during playback)
  useEffect(() => {
    if (isDragging.current) return;
    const pct = duration > 0 ? currentTime / duration : 0;
    if (rangeRef.current)       rangeRef.current.value = String(currentTime);
    if (fillRef.current)        fillRef.current.style.width = `${pct * 100}%`;
    if (currentTimeRef.current) currentTimeRef.current.textContent = formatTime(currentTime);
  }, [currentTime, duration]);

  // When duration changes, update the range max
  useEffect(() => {
    if (rangeRef.current) rangeRef.current.max = String(duration || 1);
  }, [duration]);

  function handlePointerDown() {
    isDragging.current = true;
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const val = parseFloat(e.currentTarget.value);
    const pct = duration > 0 ? val / duration : 0;
    if (fillRef.current)        fillRef.current.style.width = `${pct * 100}%`;
    if (currentTimeRef.current) currentTimeRef.current.textContent = formatTime(val);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLInputElement>) {
    isDragging.current = false;
    onSeek(parseFloat(e.currentTarget.value));
  }

  // Safety: if pointer is released outside the element
  useEffect(() => {
    function onPointerUp(e: PointerEvent) {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (rangeRef.current) onSeek(parseFloat(rangeRef.current.value));
    }
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [onSeek]);

  return (
    <div className="mt-transport">
      {/* Song info */}
      <div className="mt-transport-info">
        <span className="mt-now-playing">{songTitle}</span>
        {songKey && <span className="mt-now-key">{songKey}</span>}
      </div>

      {/* Controls */}
      <div className="mt-transport-controls">
        <button
          type="button"
          className="mt-nav-btn"
          onClick={onPrev}
          disabled={!hasPrev || isLoading}
          title="Música anterior"
        >
          ⏮
        </button>

        <button
          type="button"
          className={`mt-play-btn${isPlaying ? " playing" : ""}`}
          onClick={isPlaying ? onPause : onPlay}
          disabled={isLoading || duration === 0}
          title={isPlaying ? "Pausar" : "Play"}
        >
          {isLoading ? (
            <span className="mt-spinner" />
          ) : isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="mt-nav-btn"
          onClick={onNext}
          disabled={!hasNext || isLoading}
          title="Próxima música"
        >
          ⏭
        </button>
      </div>

      {/* Timeline */}
      <div className="mt-timeline">
        <span className="mt-time" ref={currentTimeRef}>0:00</span>
        <div className="mt-scrubber-wrap">
          <div className="mt-scrubber-track">
            <div className="mt-scrubber-fill" ref={fillRef} style={{ width: "0%" }} />
          </div>
          <input
            ref={rangeRef}
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            defaultValue={0}
            className="mt-scrubber"
            disabled={duration === 0}
            onPointerDown={handlePointerDown}
            onInput={handleInput}
            onPointerUp={handlePointerUp}
          />
        </div>
        <span className="mt-time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
