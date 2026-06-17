import { EvaluationReport } from "../types";
import { Award, Zap, Smile, BookOpen, AlertCircle } from "lucide-react";

interface EvaluationDashboardProps {
  report: EvaluationReport;
}

export default function EvaluationDashboard({ report }: EvaluationDashboardProps) {
  // Score percentage parameters for circular gauge
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (report.score / 100) * circumference;

  const scoreColorClass = (score: number) => {
    if (score >= 85) return "text-emerald-600 stroke-emerald-600";
    if (score >= 70) return "text-amber-500 stroke-amber-500";
    return "text-rose-600 stroke-rose-600";
  };

  const getScoreRatingText = (score: number) => {
    if (score >= 85) return "দুর্দান্ত! অত্যন্ত পেশাদার কণ্ঠ";
    if (score >= 70) return "ভালো প্রচেষ্টা! কিছুটা অনুশীলন প্রয়োজন";
    return "উন্নতি করতে হবে! আরও প্র্যাকটিস করুন";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden" id="ai-evaluation-dashboard">
      {/* Background Decorative Grid */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title */}
      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-4">
        <Award className="w-5 h-5 text-amber-500" />
        <h3 className="font-display font-bold text-slate-800 text-lg">
          ভয়েস-ওভার ট্রেইনার মূল্যায়ণ রিপোর্ট
        </h3>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Rating Meter */}
        <div className="md:col-span-1 bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col items-center justify-center text-center shadow-inner relative">
          <div className="relative w-24 h-24 mb-3">
            <svg className="w-full h-full transform -rotate-90">
              {/* Outer Ring */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-slate-200 fill-none"
                strokeWidth="8"
              />
              {/* Score Arc */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`fill-none transition-all duration-1000 ${scoreColorClass(report.score)}`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold text-slate-805 tracking-tighter">
                {report.score}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 -mt-1">
                rating
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-705">
            {getScoreRatingText(report.score)}
          </span>
        </div>

        {/* Categories Details */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Pronunciation & Clarity */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                উচ্চারণ ও স্পষ্টতা
              </span>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {report.pronunciationRating || 80}/১০০
              </span>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {report.pronunciationFeedback}
            </p>
          </div>

          {/* 2. Tone & Confidence */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                টোন ও আত্মবিশ্বাস
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {report.toneRating || 80}/১০০
              </span>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {report.toneFeedback}
            </p>
          </div>

          {/* 3. Speed & Flow */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                গতি, বিরতি ও শব্দশৈলী
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {report.flowRating || 80}/১০০
              </span>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {report.flowFeedback}
            </p>
          </div>

          {/* 4. Emotion Alignment */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-rose-500" />
                আবেগ ও বিজ্ঞাপন টোন
              </span>
              <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                {report.emotionRating || 80}/১০০
              </span>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {report.emotionFeedback}
            </p>
          </div>
        </div>
      </div>

      {/* Professional Coaching Tips banner */}
      {report.coachingTips && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden" id="coaching-tips-banner">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                পেশাদার ভয়েস-ওভার ট্রেইনারের দুটি গুরুত্বপূর্ণ পরামার্শ:
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                {report.coachingTips}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
