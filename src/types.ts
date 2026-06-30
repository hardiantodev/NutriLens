export type Restriction = "diabetes" | "cholesterol" | "hypertension" | "gout" | "umum";

export interface NutrientAnalysis {
  name: string;
  value: string;
  evaluation: string;
  status: "HIJAU" | "KUNING" | "MERAH";
}

export interface AnalysisResult {
  productName: string;
  status: "AMAN" | "BATASI" | "BAHAYA";
  color: "hijau" | "kuning" | "merah";
  reason: string;
  nutrients: NutrientAnalysis[];
  recommendation: string;
  speechText: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  restrictions: Restriction[];
  result: AnalysisResult;
  imageUrl: string;
}
