import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Download, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioBase64: string;
  mimeType: string;
  onDownload?: () => void;
  title?: string;
}

export default function AudioPlayer({ audioBase64, mimeType, onDownload, title = "ভয়েস-ওভার প্লেব্যাক" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  // Convert base64 to Blob URL
  useEffect(() => {
    if (!audioBase64) return;
    try {
      const binary = atob(audioBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error("Error creating audio URL from base64:", e);
    }
  }, [audioBase64, mimeType]);

  // Adjust volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Animation logic for procedural studio visualizer canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Ambient radial background glow
      const bgGlow = ctx.createRadialGradient(width / 2, height / 2, 5, width / 2, height / 2, width / 2);
      bgGlow.addColorStop(0, "rgba(240, 244, 255, 0.5)");
      bgGlow.addColorStop(1, "rgba(248, 250, 252, 0.95)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Generate visual waves
      const waveCount = 4;
      const waveColors = [
        "rgba(79, 70, 229, 0.45)", // Indigo-600
        "rgba(99, 102, 241, 0.3)",  // Indigo-500
        "rgba(14, 165, 233, 0.2)",  // Sky Blue
        "rgba(79, 70, 229, 0.1)",  // Light Indigo
      ];

      phase += isPlaying ? 0.08 : 0.01; // Ripple faster on playback

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = w === 0 ? 2.5 : 1.2;
        ctx.strokeStyle = waveColors[w];

        const amplitude = isPlaying 
          ? (height / 3.2) * (1 - w * 0.22) * (0.45 + Math.sin(phase * 0.8) * 0.15)
          : (height / 10) * (1 - w * 0.2) * (0.5 + Math.sin(phase * 0.3) * 0.1); // Subdued wave when paused
        
        ctx.moveTo(0, height / 2);

        for (let x = 0; x < width; x++) {
          const frequency = (0.006 + w * 0.0015);
          const y = height / 2 + Math.sin(x * frequency + phase + w * Math.PI / 4) * amplitude;
          ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      // Draw center recording guideline
      ctx.beginPath();
      ctx.strokeStyle = "rgba(79, 70, 229, 0.12)";
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = `bengali-voice-over.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden" id="studio-audio-player-card">
      {/* Decorative Glowing Ring */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h4 className="font-display font-semibold text-slate-800 text-sm tracking-wide">
            {title}
          </h4>
        </div>
        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/80 shadow-sm">
          24,000 Hz • WAV Mono
        </span>
      </div>

      {/* Procedural Wave Canvas */}
      <div className="w-full h-24 mb-6 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={96} 
          className="w-full h-full block"
        />
        {isPlaying && (
          <div className="absolute bottom-2 left-3 bg-indigo-50/90 border border-indigo-150 text-[10px] text-indigo-600 font-mono px-2 py-0.5 rounded flex items-center gap-1.5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            সরাসরি সম্প্রচারিত
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Workspace Controls */}
      <div className="space-y-4">
        {/* Progress Bar & Durations */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleScrubChange}
            className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-500 w-10 text-left">
            {formatTime(duration)}
          </span>
        </div>

        {/* Media Control Toolbar */}
        <div className="flex items-center justify-between pt-2">
          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1 bg-slate-105 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Core play action */}
          <button
            onClick={togglePlay}
            disabled={!audioUrl}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md ${
              isPlaying 
                ? "bg-amber-600 hover:bg-amber-500 text-white scale-105" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white scale-105 hover:shadow-indigo-500/20 glow-btn"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? "বিরতি নিন" : "প্লে করুন"}
            id="play-pause-sound-btn"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current stroke-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5 stroke-current" />
            )}
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadClick}
            disabled={!audioUrl}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="ডাউনলোড (WAV ফাইল)"
            id="download-sound-btn"
          >
            <Download className="w-4 h-4" />
            ডাউনলোড
          </button>
        </div>
      </div>
    </div>
  );
}
