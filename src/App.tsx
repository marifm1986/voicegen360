import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, 
  Volume2, 
  Sliders, 
  Sparkles, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  Award, 
  AlertCircle, 
  Trash2, 
  HelpCircle, 
  Info,
  ChevronRight,
  Music,
  Download,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { SCRIPT_PRESETS, VOICE_PRESETS, TONE_OPTIONS, SPEED_OPTIONS } from "./data";
import { EvaluationReport } from "./types";
import AudioPlayer from "./components/AudioPlayer";
import EvaluationDashboard from "./components/EvaluationDashboard";

export default function App() {
  // Script configuration states
  const [selectedScriptId, setSelectedScriptId] = useState("restaurant");
  const [customScript, setCustomScript] = useState(SCRIPT_PRESETS[0].content);
  const [voiceName, setVoiceName] = useState("Kore");
  const [tone, setTone] = useState("warm");
  const [speed, setSpeed] = useState("medium");

  // AI TTS Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [generatedMimeType, setGeneratedMimeType] = useState<string | null>(null);
  const [generatedPlaybackTitle, setGeneratedPlaybackTitle] = useState("");

  // Recording (vocal practice) states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // AI evaluation states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Update editor text when preset is modified
  const handleScriptPresetChange = (presetId: string) => {
    setSelectedScriptId(presetId);
    if (presetId === "custom") {
      setCustomScript("");
    } else {
      const preset = SCRIPT_PRESETS.find(p => p.id === presetId);
      if (preset) {
        setCustomScript(preset.content);
      }
    }
    // Clear old scores and audio relative to previous script
    setGeneratedAudioBase64(null);
    setRecordingBlob(null);
    setRecordingUrl(null);
    setEvaluationReport(null);
    setGenerationError(null);
    setEvaluationError(null);
  };

  // Predict spoken seconds based on word density (standard Bengali is approx 120 words per min)
  const estimateSpeechDuration = (text: string) => {
    const cleaned = text.trim().replace(/\s+/g, " ");
    if (!cleaned) return 0;
    const wordsCount = cleaned.split(" ").length;
    return Math.max(2, Math.round((wordsCount / 120) * 60));
  };

  // 1. Call custom server endpoint to generate AI Voice-over
  const handleGenerateVoice = async () => {
    if (!customScript.trim()) {
      setGenerationError("অনুগ্রহ করে কিছু স্ক্রিপ্ট টাইপ করুন বা সিলেক্ট করুন।");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedAudioBase64(null);

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: customScript,
          voiceName: voiceName,
          tone: tone,
          speed: speed,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "ভয়েস ক্রিয়েট করতে ব্যর্থ হয়েছে।");
      }

      setGeneratedAudioBase64(data.audioBase64);
      setGeneratedMimeType(data.mimeType);
      
      const matchedVoice = VOICE_PRESETS.find(v => v.name === voiceName);
      setGeneratedPlaybackTitle(`🍔 বিজ্ঞাপন ভয়েস - ${matchedVoice?.displayName || voiceName}`);

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "ভয়েস-ওভার জেনারেশন ব্যর্থ হয়েছে। স্পিড বা পেমেন্ট সেটিং এক্সপায়ার হয়ে থাকতে পারে।");
    } finally {
      setIsGenerating(false);
    }
  };

  // Recording management: Start microphone stream
  const handleStartRecording = async () => {
    setRecordingError(null);
    setRecordingBlob(null);
    setRecordingUrl(null);
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentStreamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        options = { mimeType: "audio/ogg" };
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setRecordingBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordingUrl(url);

        // Turn off the hardware mic light
        if (currentStreamRef.current) {
          currentStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      recorder.start();

      // Tick recording seconds timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Mic access denied:", err);
      setRecordingError("মাইক্রোফোন অ্যাক্সেস করতে ব্যর্থ। অনুগ্রহ করে সেটিংস বা ব্রাউজার ও ইফ্রেমে মাইক্রোফোন পারমিশন সচল করুন।");
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Cleanup recording handles
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Convert blob to Base64 to upload
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]);
        } else {
          reject("Failed to format sound bytes.");
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Submit student voice acting to AI Trainer for Audition Coaching report
  const handleEvaluatePractice = async () => {
    if (!recordingBlob) {
      setEvaluationError("কোনো ভয়েস রেকর্ড পাওয়া যায়নি। আগে রেকর্ড শেষ করুন।");
      return;
    }

    setIsEvaluating(true);
    setEvaluationError(null);
    setEvaluationReport(null);

    try {
      const rawBase64 = await blobToBase64(recordingBlob);
      const res = await fetch("/api/evaluate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBase64: rawBase64,
          mimeType: recordingBlob.type || "audio/webm",
          script: customScript,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "মূল্যায়ন সম্পন্ন করতে ব্যর্থ।");
      }

      setEvaluationReport(data.report);

    } catch (err: any) {
      console.error("Evaluation failed:", err);
      setEvaluationError(err.message || "ভয়েস মূল্যায়ন করার প্রসেসটি ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Format recording ticks to readable time
  const formatSecs = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-100 selection:bg-indigo-600 selection:text-white font-sans tracking-normal relative px-4 py-8 md:py-12 flex flex-col justify-start">
      {/* Absolute Neon Glow Highlights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-12 right-10 w-[400px] h-[450px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto space-y-8 flex-1 flex flex-col justify-between" id="voice-over-studio-app-body">
        
        {/* Modern Studio Custom Header */}
        <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-2" id="studio-app-header">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600 p-2.5 rounded-xl text-white font-black shadow-sm flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-display font-bold text-slate-800 leading-tight">
                কণ্ঠশিল্পী <span className="text-indigo-600">AI</span> বাংলা ভয়েস-ওভার স্টুডিও  
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                উষ্ণ, আত্মবিশ্বাসী এবং পেশাদার বাংলা কথ্য শৈলীতে আকর্ষণীয় ভয়েস-ওভার ও ডাবিং অডিশন সেন্টার।
              </p>
            </div>
          </div>

          {/* Quick status bar */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[12px] text-slate-600 self-stretch md:self-auto justify-center md:justify-start">
            <div className="flex items-center gap-1.5 text-indigo-605 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              এআই সার্ভার স্ট্যাটাস: সচল
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
              GEMINI-3.5
            </div>
          </div>
        </header>

        {/* Studio Console Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
          
          {/* Left Column: Script Selection, Editing, Voice configs (Dashboard 7/12 cols) */}
          <section className="lg:col-span-7 space-y-6" id="studio-configuration-deck">
            
            {/* 1. Script Preset Drawer Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h2 className="font-display font-semibold text-slate-800 text-sm tracking-wide">
                  পেশাদার বাংলা বিজ্ঞাপন স্ক্রিপ্ট লাইব্রেরি
                </h2>
              </div>

              {/* Presets Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCRIPT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleScriptPresetChange(preset.id)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border text-xs transition-all relative overflow-hidden group ${
                      selectedScriptId === preset.id
                        ? "bg-indigo-50 border-indigo-200 text-indigo-900 ring-1 ring-indigo-500/5 shadow-sm"
                        : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-slate-650"
                    }`}
                  >
                    <span className="font-semibold text-[13px] text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {preset.title}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 line-clamp-1 group-hover:text-slate-705 transition-colors">
                      {preset.description}
                    </span>
                    {selectedScriptId === preset.id && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Script Draft Text area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    স্ক্রিপ্ট খসড়া এডিটর
                  </span>
                  <div className="flex gap-4">
                    <span>শব্দ সংখ্যা: <strong className="text-slate-700">{customScript.trim() ? customScript.trim().split(/\s+/).length : 0}</strong></span>
                    <span>কথ্য সময়: ~<strong className="text-indigo-600 font-mono font-bold">{estimateSpeechDuration(customScript)} সে.</strong></span>
                  </div>
                </div>

                <textarea
                  value={customScript}
                  onChange={(e) => {
                    setCustomScript(e.target.value);
                    if (selectedScriptId !== "customPreset") {
                      setSelectedScriptId("custom");
                    }
                  }}
                  placeholder="আপনার বিজ্ঞাপনের বাংলা স্ক্রিপ্ট এখানে লিখুন..."
                  className="w-full h-44 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-4 text-slate-800 text-sm font-sans leading-relaxed focus:outline-none resize-none shadow-inner"
                  id="script-text-editor"
                />
              </div>
            </div>

            {/* 2. Audio Configuration Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h2 className="font-display font-semibold text-slate-800 text-sm tracking-wide">
                    ভয়েস টোন এবং মডেল প্যারামিটার্স
                  </h2>
                </div>
                <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-150 font-medium font-sans">
                  এআই ডাবিং কনসোল
                </span>
              </div>

              {/* Voice Actor selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 block">
                  ১. ভয়েস ওভার চরিত্র বা শৈলী নির্বাচন (AI Artist Profiles)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {VOICE_PRESETS.map((voice) => (
                    <button
                      key={voice.name}
                      onClick={() => setVoiceName(voice.name)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        voiceName === voice.name
                          ? "bg-indigo-50 border-indigo-250 text-indigo-900 shadow-sm ring-1 ring-indigo-500/5"
                          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-650 hover:text-slate-800"
                      }`}
                      title={voice.description}
                    >
                      <span className="text-xl mb-1">{voice.previewEmoji}</span>
                      <span className="text-xs font-semibold block leading-tight truncate w-full text-slate-805">
                        {voice.displayName.split(" ")[0]}
                      </span>
                      <span className="text-[9px] text-indigo-500 mt-0.5 uppercase tracking-wide font-medium">
                        {voice.gender.includes("Female") ? "নারী" : "পুরুষ"}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Active character description explanation */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="font-sans">
                    <strong className="text-slate-850">
                      {VOICE_PRESETS.find(v => v.name === voiceName)?.displayName}:
                    </strong>{" "}
                    {VOICE_PRESETS.find(v => v.name === voiceName)?.description}
                  </p>
                </div>
              </div>

              {/* Tone and Speed row settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Style Emotion / Tone */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 block">
                    ২. আবৃত্তি আবেগ ও মডুলেশন (Tone & Emotion)
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    {TONE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Narrator Speed duration */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 block">
                    ৩. কথন গতি ও প্রবাহ (Narration Speed)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SPEED_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSpeed(opt.id)}
                        className={`py-2 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                          speed === opt.id
                            ? "bg-indigo-50 border-indigo-250 text-indigo-700 font-semibold"
                            : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {opt.label.split(" ")[0]} ({opt.modifierValue})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </section>

          {/* Right Column: AI Generator, Audio Player, Practice Suite with AI Trainer Review (5/12 cols) */}
          <section className="lg:col-span-5 space-y-6" id="studio-workstation-deck">
            
            {/* 1. Voice Generating Control Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="ai-voice-generation-booth-card">
              
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-indigo-650 animate-pulse" />
                <h2 className="font-display font-semibold text-slate-800 text-sm tracking-wide">
                  ভয়েস-ওভার প্রডিউসার বুথ
                </h2>
              </div>

              {/* Call-to-action button */}
              {!generatedAudioBase64 && !isGenerating && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100 shadow-inner">
                    <Volume2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-[280px]">
                    <h3 className="text-xs font-bold text-slate-705">ভয়েস রেকর্ডিংস জেনারেট করুন</h3>
                    <p className="text-[11px] text-slate-500 leading-normal font-sans">
                      আপনার স্ক্রিপ্ট ও কণ্ঠস্বর শৈলীটি নির্বাচন করে নিচের বাটনটিতে প্রেস করুন।
                    </p>
                  </div>
                </div>
              )}

              {/* Loader with custom descriptive messages during compilation */}
              {isGenerating && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    {/* Ring loader */}
                    <div className="w-12 h-12 border-4 border-slate-150 border-t-indigo-600 rounded-full animate-spin" />
                    <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="text-center space-y-1.5 animate-pulse">
                    <p className="text-xs font-bold text-slate-750">বাংলা কণ্ঠস্বর তৈরি করা হচ্ছে...</p>
                    <p className="text-[10px] text-indigo-600 font-sans tracking-wide">
                      মডেল পিচ ব্যালেন্সিং • ২৪,০০০ মেগাহার্জ পালস
                    </p>
                  </div>
                </div>
              )}

              {/* Rendering generated error panel */}
              {generationError && (
                <div className="bg-rose-50 border border-rose-150 rounded-xl p-4 flex gap-3 text-rose-700 text-xs text-left" id="tts-generation-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold mb-0.5">জেনারেট করতে সমস্যা হয়েছে</h5>
                    <p className="leading-normal">{generationError}</p>
                  </div>
                </div>
              )}

              {/* Generated Playback Screen */}
              {generatedAudioBase64 && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <AudioPlayer 
                    audioBase64={generatedAudioBase64} 
                    mimeType={generatedMimeType || "audio/wav"} 
                    title={generatedPlaybackTitle}
                  />
                  <p className="text-[10px] text-center text-slate-500 font-sans">
                    💡 ভয়েসটি ঠিকঠাক লেগেছে? উপরের ডানদিকের ডাউনলোড বাটনে চেপে ডাব্লিউএভি ফাইল নামিয়ে নিন।
                  </p>
                </motion.div>
              )}

              {/* Action trigger button */}
              <button
                onClick={handleGenerateVoice}
                disabled={isGenerating || !customScript.trim()}
                className={`w-full py-3.5 px-4 rounded-xl font-display font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isGenerating || !customScript.trim()
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-lg shadow-indigo-100/50 glow-btn"
                }`}
                id="generate-voice-submit-btn"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    মডুলেটিং ভয়েস...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    ভয়েস-ওভার জেনারেট করুন (Generate AI Voice)
                  </>
                )}
              </button>
            </div>

            {/* 2. Vocal Practice Auditor & Mic recorder booth */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="practice-microphon-booth">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <h2 className="font-display font-semibold text-slate-805 text-sm tracking-wide">
                    শব্দ সাধনা ও প্র্যাকটিস স্টুডিও
                  </h2>
                </div>
                <span className="text-[11px] text-indigo-620 bg-indigo-50/70 px-2 py-0.5 rounded-md border border-indigo-150/60 font-sans font-medium">
                  ভয়েস ওভার অডিশন
                </span>
              </div>

              {/* Brief tutorial helpful reminder */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-605 space-y-1.5" id="tutorial-banner">
                <h4 className="font-bold flex items-center gap-1.5 text-indigo-650">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  নিজেকে যাচাই করুন (Practice Studio):
                </h4>
                <p className="leading-relaxed">
                  উষ্ণ, আত্মবিশ্বাসী এবং মনোরম বাংলা টোন বজায় রেখে উপরের বামদিকের খসড়া স্ক্রিপ্টটি নিজের মুখে উচ্চারণ করে পড়ুন। এরপর নিচে রেকর্ড করে এআই ট্রেইনার থেকে মূল্যায়ন রিপোর্ট নিন!
                </p>
              </div>

              {/* Workspace Recording Panel Controls */}
              <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 relative flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                {/* Visualizer representation during record */}
                {isRecording ? (
                  <div className="flex items-center justify-center gap-1 h-8">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 5, 2, 4, 3, 1].map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-rose-500 rounded-full"
                        style={{ height: `${h * 4}px` }}
                        animate={{
                          height: [
                            `${h * 2}px`,
                            `${h * 6}px`,
                            `${h * 2}px`
                          ]
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.05
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-250 flex items-center justify-center text-slate-500 shadow-sm">
                    {recordingBlob ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </div>
                )}

                {/* Duration and buttons */}
                <div className="space-y-1">
                  {isRecording ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-550 tracking-wider uppercase animate-pulse">রেকর্ডিং চলছে...</p>
                      <p className="text-xl font-mono font-bold text-slate-800">{formatSecs(recordingTime)}</p>
                    </div>
                  ) : recordingBlob ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-605">রেকর্ডিং সম্পন্ন হয়েছে!</p>
                      <p className="text-[11px] text-slate-500 font-mono">টাইপ: {recordingBlob.type.split(";")[0]} • আকার: {(recordingBlob.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium font-sans">রেকর্ডিং শুরু করতে নিচের লাল বাটনে চাপুন</p>
                  )}
                </div>

                {/* Playback student record locally */}
                {recordingUrl && !isRecording && (
                  <div className="w-full shrink-0 max-w-sm pt-2" id="practiced-voice-playback-bar">
                    <p className="text-[10px] text-slate-500 mb-1.5 font-semibold font-sans">আপনার রেকর্ড করা ভয়েস প্লেব্যাক করুন:</p>
                    <audio src={recordingUrl} controls className="w-full h-8 accent-indigo-600 rounded bg-white border border-slate-200" />
                  </div>
                )}

                {/* Handle Microphone Trigger buttons */}
                <div className="flex gap-4">
                  {isRecording ? (
                    <button
                      onClick={handleStopRecording}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-550 active:scale-95 text-white font-semibold text-xs rounded-full shadow-md transition-all border border-rose-500/10"
                      id="stop-micro-btn"
                    >
                      থামুন (Stop Track)
                    </button>
                  ) : (
                    <button
                      onClick={handleStartRecording}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-550 active:scale-95 text-white font-semibold text-xs rounded-full shadow-md transition-all border border-rose-500/10 flex items-center gap-1.5 animate-pulse"
                      id="start-micro-btn"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                      রেকর্ড করুন (Record Mic)
                    </button>
                  )}

                  {recordingBlob && !isRecording && (
                    <button
                      onClick={() => {
                        setRecordingBlob(null);
                        setRecordingUrl(null);
                        setEvaluationReport(null);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-semibold text-xs rounded-full transition-all border border-slate-250 shadow-sm"
                      title="মুছে ফেলে নতুন করুন"
                    >
                      রিসেট (Reset)
                    </button>
                  )}
                </div>

                {/* Error handling mic issues */}
                {recordingError && (
                  <div className="text-rose-600 text-[11px] leading-relaxed flex gap-1.5 items-start mt-2 font-sans">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{recordingError}</span>
                  </div>
                )}
              </div>

              {/* Submit to AI feedback Trigger */}
              {recordingBlob && !isRecording && (
                <div className="pt-2 animate-fade-in animate-duration-300">
                  <button
                    onClick={handleEvaluatePractice}
                    disabled={isEvaluating}
                    className={`w-full py-3.5 px-4 rounded-xl font-display font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isEvaluating
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] shadow-lg shadow-indigo-100/50 border border-indigo-500/10"
                    }`}
                    id="submit-evaluate-voice-btn"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                        এআই বিশ্লেষণ চলছে (Trainer Evaluating)...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 text-amber-500 fill-current animate-pulse" />
                        রেকর্ডিং ইভালুয়েশন করুন (Get AI Audition Feedbacks)
                      </>
                    )}
                  </button>

                  {/* Evaluating Loader */}
                  {isEvaluating && (
                    <div className="pt-3" id="evaluating-progress-meter">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          className="bg-indigo-600 h-full rounded-full"
                          initial={{ width: "10%" }}
                          animate={{ width: "95%" }}
                          transition={{ duration: 12 }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-indigo-605 mt-2 font-mono uppercase tracking-widest animate-pulse font-semibold">
                        Analyzing pronunciation, resonance, pace, and dramatic timings...
                      </p>
                    </div>
                  )}

                  {/* Evaluaion Error representation */}
                  {evaluationError && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 text-rose-750 text-xs text-left mt-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold mb-0.5">বিশ্লেষণ করতে অসামর্থ্য হয়েছে</h5>
                        <p className="leading-normal font-sans">{evaluationError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

          </section>

        </main>

        {/* Outer bottom-deck matching evaluated report cards */}
        <AnimatePresence>
          {evaluationReport && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <EvaluationDashboard report={evaluationReport} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info containing expert attributes */}
        <footer className="text-center text-[11px] text-slate-500 pt-12 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans">
            স্বত্বাধিকার © ২০২৬ বাংলা এআই ভয়েস স্টুডিও প্রজেক্ট। সর্বস্বত্ব সংরক্ষিত।
          </p>
          <div className="flex gap-4">
            <span className="hover:text-indigo-650 transition-colors cursor-pointer">পাবলিক লাইসেন্স</span>
            <span className="hover:text-indigo-650 transition-colors cursor-pointer">গাইডালিনস</span>
            <span className="hover:text-indigo-650 transition-colors cursor-pointer">সার্ভার ডকুমেন্টেশন</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
