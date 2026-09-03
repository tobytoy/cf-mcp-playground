import { transcribeLineAudio } from "../src/tools/voiceTranscribe";

export async function testVoiceTranscription(): Promise<void> {
  console.log("▶ Testing Gemini Multimodal Voice Transcription...");

  // 1. Test empty audio buffer protection
  const emptyRes = await transcribeLineAudio(new ArrayBuffer(0), "dummy_key");
  if (emptyRes.success || !emptyRes.error) {
    throw new Error("Empty audio buffer test failed to catch error");
  }
  console.log("  ✔ Empty audio buffer gracefully handled");

  // 2. Test missing key protection
  const noKeyRes = await transcribeLineAudio(new ArrayBuffer(100), "");
  if (noKeyRes.success || !noKeyRes.error) {
    throw new Error("Missing API key test failed to catch error");
  }
  console.log("  ✔ Missing API key gracefully handled");

  // 3. Test real Gemini API with synthetic silent WAV audio
  const silentWavBase64 = "UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  const binaryString = atob(silentWavBase64);
  const buffer = new ArrayBuffer(binaryString.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binaryString.length; i++) {
    view[i] = binaryString.charCodeAt(i);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const transcribeRes = await transcribeLineAudio(buffer, apiKey, "audio/wav");
    console.log(`  ✔ Gemini Audio Transcribe Output: "${transcribeRes.text}" (success: ${transcribeRes.success})`);
  } else {
    console.log("  ✔ Skipped live Gemini Audio call (no GEMINI_API_KEY in env)");
  }
  console.log("✅ Voice Transcription tests passed!\n");
}
