import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

// Body size limit increased for raw user recorded audio uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiClient: GoogleGenAI | null = null;

// Lazy initialization of Gemini SDK to prevent startup crashes
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in your Secrets. Please set it in the Secrets manager.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to bundle raw pcm (24kHz Mono, 16-bit) to standardized WAV file
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  
  // Chunk ID
  header.write("RIFF", 0);
  // Chunk Size
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  // Format
  header.write("WAVE", 8);
  
  // Subchunk1 ID
  header.write("fmt ", 12);
  // Subchunk1 Size
  header.writeUInt32LE(16, 16);
  // Audio Format (1 for PCM)
  header.writeUInt16LE(1, 20);
  // Number of Channels (Mono = 1)
  header.writeUInt16LE(1, 22);
  // Sample Rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte Rate
  header.writeUInt32LE(sampleRate * 1 * (16 / 8), 28);
  // Block Align
  header.writeUInt16LE(1 * (16 / 8), 32);
  // Bits per Sample
  header.writeUInt16LE(16, 34);
  
  // Subchunk2 ID
  header.write("data", 36);
  // Subchunk2 Size
  header.writeUInt32LE(pcmBuffer.length, 40);
  
  return Buffer.concat([header, pcmBuffer]);
}

// 1. Endpoint to generate voice-over audio (Gemini TTS)
app.post("/api/generate-voice", async (req, res) => {
  try {
    const { script, voiceName = "Kore", tone = "warm", speed = "medium" } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: "স্ক্রিপ্ট প্রয়োজন।" });
    }

    const ai = getAiClient();

    // Map speed options to conversational instructions
    let speedDirective = "at a medium, natural flow speed";
    if (speed === "slow") speedDirective = "at a slow, well-paced, highly articulate speed";
    if (speed === "fast") speedDirective = "at a moderately fast, energetic and professional speed";

    // Build standard, specific prompt to direct model narration exactly as requested
    const directivePrompt = `You are a professional Bengali advertisement voice-over artist speaker.
Read the following Bengali text clearly, using a very ${tone} and native standard Bengali accent (Bangladesh).
Emotion: Friendly, modern, confident and inviting, with standard professional advertising delivery.
Speed and Pause Direction: Read ${speedDirective}. Keep a natural pause at the end of each sentence structure.
Do not emit any introduction, metadata, background music or commentary. Only output the spoken audio.

Text to read:
"${script}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: directivePrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, // puck, charon, kore, fenrir, zephyr
          }
        }
      }
    });

    const val = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!val) {
      return res.status(500).json({ error: "ভয়েস জেনারেট করা সম্ভব হয়নি। অনুগ্রহ করে প্রম্পট বা সেটিংস পরিবর্তন করুন।" });
    }

    const rawBuffer = Buffer.from(val, "base64");
    // Standardize raw 24kHz PCM to playable WAV Buffer
    const wavBuffer = pcmToWav(rawBuffer, 24000);
    const wavBase64 = wavBuffer.toString("base64");

    res.json({
      success: true,
      audioBase64: wavBase64,
      mimeType: "audio/wav"
    });

  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({ error: error.message || "সার্ভার এরর ঘটেছে।" });
  }
});

// 2. Endpoint to critique recorded vocal practice (AI Audition Evaluation)
app.post("/api/evaluate-voice", async (req, res) => {
  try {
    const { audioBase64, mimeType, script } = req.body;

    if (!audioBase64 || !mimeType || !script) {
      return res.status(400).json({ error: "অডিও ডেটা এবং স্ক্রিপ্ট উভয়ই প্রয়োজন।" });
    }

    const ai = getAiClient();

    const evaluationPrompt = `উক্ত অডিও ক্লিপটি মনোযোগ দিয়ে শুনুন যেখানে ব্যবহারকারী নিচের বাংলা বিজ্ঞাপন স্ক্রিপ্টটি ভয়েস-ওভার হিসেবে পড়েছেন:
      
"${script}"

অনুগ্রহ করে একজন অভিজ্ঞ বাংলা বিজ্ঞাপন ভয়েস-ওভার ট্রেইনার হিসেবে ব্যবহারকারীর কণ্ঠস্বর মূল্যায়ন করুন। নিচের ৪টি বিষয়ের উপর ভিত্তি করে মূল্যায়ন করুন এবং প্রত্যেকটির জন্য রেটিং (১০০ এর মধ্যে) দিন:
১. প্রমিত বাংলা উচ্চারণ ও স্পষ্টতা (Pronunciation & Clarity)
২. ভয়েস টোন ও আত্মবিশ্বাস (Tone & Confidence)
৩. গতি, বিরতি ও শব্দশৈলী (Speed, Pauses & Flow)
৪. আবেগ ও আবেদন (Emotion & Resonance - বিজ্ঞাপন অনুযায়ী উষ্ণ, আমন্ত্রণমূলক ও মনোরম অনুভূতি)

আপনার মূল্যায়নটি সম্পূর্ণ বাংলায় এবং সুন্দর গঠনশীল ফিডব্যাক সহ প্রদান করুন। আপনার উত্তরটি JSON ফরম্যাটে দিন এই স্কিমা অনুযায়ী:
{
  "score": number (গড় স্কোর),
  "pronunciationRating": number,
  "pronunciationFeedback": "উচ্চারণ সম্পর্কে পরামর্শ",
  "toneRating": number,
  "toneFeedback": "টোন এবং আত্মবিশ্বাস সম্পর্কে ফিডব্যাক",
  "flowRating": number,
  "flowFeedback": "গতি এবং বিরতি সম্পর্কে ফিডব্যাক",
  "emotionRating": number,
  "emotionFeedback": "আবেগ এবং বিজ্ঞাপন অনুভূতি সম্পর্কে ফিডব্যাক",
  "coachingTips": "সামগ্রিক উন্নতি করার জন্য ২টি চমৎকার পেশাদার পরামর্শ"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType
          }
        },
        {
          text: evaluationPrompt
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: "মূল্যায়ন রিপোর্ট তৈরি করা সম্ভব হয়নি।" });
    }

    const parsedReport = JSON.parse(responseText.trim());
    res.json({
      success: true,
      report: parsedReport
    });

  } catch (error: any) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: error.message || "সার্ভার এরর ঘটেছে।" });
  }
});

// Configure Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Bengali Voice-Over Studio serving on http://0.0.0.0:${PORT}`);
  });
}

startServer();
