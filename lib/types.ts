export interface LimeWord {
  word: string;
  score: number;
}

export type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk";

export interface AnalysisResult {
  text_score: number;
  face_score: number;
  voice_score: number;
  phq9_score: number;
  final_score: number;
  risk_level: RiskLevel;
  lime_words: LimeWord[];
  detected_face_emotion: string;
  detected_voice_emotion: string;
  phq9_total: number;
  phq9_severity: string;
}

export interface PHQ9Answer {
  question_id: number;
  answer: number;
}
