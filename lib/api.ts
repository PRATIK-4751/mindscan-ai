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

export async function analyzeText(text: string) {
  try {
    const { data } = await api.post<{ text_score: number; lime_words: LimeWord[] }>("/text", { text });
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function analyzeFace(image: File) {
  try {
    const formData = new FormData();
    formData.append("image", image);
    const { data } = await api.post<{ face_score: number; detected_face_emotion: string }>("/vision", formData);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function analyzeVoice(audio: File) {
  try {
    const formData = new FormData();
    formData.append("audio", audio);
    const { data } = await api.post<{ voice_score: number; detected_voice_emotion: string }>("/voice", formData);
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
