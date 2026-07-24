import axios from "axios";
import type { AnalysisResult, LimeWord } from "./types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

const sleepMessage = "Our servers are waking up, please wait 30 seconds...";

const normalizeError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (error.code === "ECONNABORTED" || status === 502 || status === 503 || status === 504) {
      return new Error(sleepMessage);
    }
  }
  return error;
};

export interface TextAnalysisResponse {
  reply: string;
  text_score: number;
  lime_words: LimeWord[];
  detected_emotions: string[];
  summary: string;
}

export async function analyzeText(text: string): Promise<TextAnalysisResponse> {
  try {
    const { data } = await api.post<TextAnalysisResponse>("/text", { text });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export interface FaceDetectionClientResult {
  emotions: Record<string, number>;
  dominant_emotion: string;
  confidence: number;
  face_detected: boolean;
}

export async function analyzeFace(image: File, clientEmotions?: FaceDetectionClientResult) {
  try {
    const formData = new FormData();
    formData.append("image", image);
    if (clientEmotions) {
      formData.append("clientEmotions", JSON.stringify(clientEmotions));
    }
    const { data } = await api.post<{
      face_score: number;
      detected_face_emotion: string;
      faces_detected: number;
      emotions: Record<string, number> | null;
      dominant_emotion: string | null;
      emotion_confidence: number | null;
      google_labels: string[];
    }>("/vision", formData);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function analyzeVoice(audio: File, transcript?: string) {
  try {
    const formData = new FormData();
    formData.append("audio", audio);
    if (transcript) formData.append("transcript", transcript);
    const { data } = await api.post<{ voice_score: number; detected_voice_emotion: string; transcript?: string }>("/voice", formData);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function analyzePHQ9(answers: number[]) {
  try {
    const { data } = await api.post<{ phq9_score: number; phq9_total: number; phq9_severity: string }>("/phq9", {
      answers,
    });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function analyzeCombined(payload: {
  text_score: number;
  face_score: number;
  voice_score: number;
  phq9_score: number;
}) {
  try {
    const { data } = await api.post<AnalysisResult>("/combined", payload);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function sendChatMessage(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
) {
  try {
    const { data } = await api.post<{ reply: string }>("/chat", { messages, systemPrompt });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function generateTTS(text: string) {
  try {
    const { data } = await api.post<{ audio: string }>("/tts", { text });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}
