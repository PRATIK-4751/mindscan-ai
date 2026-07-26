export interface LimeWord {
  word: string;
  score: number;
}

export interface ShapValue {
  feature: string;
  display_name?: string;
  value: number;
  shap_value: number;
  contribution: number;
  category?: string;
  is_depression_indicator?: boolean;
  depression_note?: string;
}

export type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk" | "High Risk (Silent Distress)";

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
  silentDistress?: boolean;
}

export interface PHQ9Answer {
  question_id: number;
  answer: number;
}
