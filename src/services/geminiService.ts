import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  summary_en: string;
  summary_ur: string;
  rights: string[];
  action: string;
}

export const analyzeDocument = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this Pakistani legal or utility document. 
    Provide the following:
    1. A simple summary of what the document is and its main content in English (summary_en).
    2. A simple summary of what the document is and its main content in Urdu script (summary_ur).
    3. Exactly 3 legal options or rights the user has regarding this document in English.
    4. Exactly 1 clear next action step in English.
    
    Return the response in JSON format matching this schema:
    {
      "summary_en": "string",
      "summary_ur": "string",
      "rights": ["string", "string", "string"],
      "action": "string"
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image.split(",")[1] || base64Image,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary_en: { type: Type.STRING },
          summary_ur: { type: Type.STRING },
          rights: { 
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 3,
            maxItems: 3
          },
          action: { type: Type.STRING },
        },
        required: ["summary_en", "summary_ur", "rights", "action"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}") as AnalysisResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze document. Please try again.");
  }
};

export const generateUrduSpeech = async (urduText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: urduText }] }],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: "Kore" // This is a good Urdu-capable voice
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // The Gemini TTS model returns raw PCM data (16-bit, mono, 24kHz).
      // To play it in the browser using the Audio object, we need to add a WAV header.
      const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      
      const header = new ArrayBuffer(44);
      const view = new DataView(header);
      
      // RIFF identifier
      view.setUint32(0, 0x52494646, false);
      // File length
      view.setUint32(4, 36 + pcmData.length, true);
      // RIFF type
      view.setUint32(8, 0x57415645, false);
      // Format chunk identifier
      view.setUint32(12, 0x666d7420, false);
      // Format chunk length
      view.setUint32(16, 16, true);
      // Sample format (1 is PCM)
      view.setUint16(20, 1, true);
      // Channel count
      view.setUint16(22, numChannels, true);
      // Sample rate
      view.setUint32(24, sampleRate, true);
      // Byte rate (sample rate * numChannels * bitsPerSample / 8)
      view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
      // Block align (numChannels * bitsPerSample / 8)
      view.setUint16(32, numChannels * (bitsPerSample / 8), true);
      // Bits per sample
      view.setUint16(34, bitsPerSample, true);
      // Data chunk identifier
      view.setUint32(36, 0x64617461, false);
      // Data chunk length
      view.setUint32(40, pcmData.length, true);
      
      const wavData = new Uint8Array(44 + pcmData.length);
      wavData.set(new Uint8Array(header), 0);
      wavData.set(pcmData, 44);
      
      const blob = new Blob([wavData], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error("Gemini TTS failed, falling back to browser TTS:", error);
  }
  
  return ""; // UI will handle browser fallback if empty
};
