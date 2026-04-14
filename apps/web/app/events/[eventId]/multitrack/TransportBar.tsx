"use client";

import { useRef, useState } from "react";

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
  const isDraggingRef = useRef(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  const displayTime = scrubValue !== null ? scrubValue : currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

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
        <span className="mt-time">{formatTime(displayTime)}</span>
        <div className="mt-scrubber-wrap">
          <div className="mt-scrubber-track">
            <div className="mt-scrubber-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={displayTime}
            className="mt-scrubber"
            disabled={duration === 0}
            onMouseDown={() => { isDraggingRef.current = true; }}
            onTouchStart={() => { isDraggingRef.current = true; }}
            onChange={(e) => setScrubValue(parseFloat(e.target.value))}
            onMouseUp={(e) => {
              isDraggingRef.current = false;
              onSeek(parseFloat((e.target as HTMLInputElement).value));
              setScrubValue(null);
            }}
            onTouchEnd={(e) => {
              isDraggingRef.current = false;
              onSeek(parseFloat((e.target as HTMLInputElement).value));
              setScrubValue(null);
            }}
          />
        </div>
        <span className="mt-time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
