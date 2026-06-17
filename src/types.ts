export interface ScriptPreset {
  id: string;
  title: string;
  category: string;
  content: string;
  description: string;
}

export interface VoicePreset {
  name: string; // 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'
  displayName: string;
  gender: string;
  description: string;
  previewEmoji: string;
}

export interface EvaluationReport {
  score: number;
  pronunciationRating: number;
  pronunciationFeedback: string;
  toneRating: number;
  toneFeedback: string;
  flowRating: number;
  flowFeedback: string;
  emotionRating: number;
  emotionFeedback: string;
  coachingTips: string;
}

export interface VoiceConfig {
  script: string;
  voiceName: string;
  tone: string;
  speed: string;
}
