export interface Transaction {
  id: string; // unique local ID for managing key attributes
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive for income, negative for expenses
  category: string;
  notes: string;
  isNew?: boolean;
}

export type ExtractionStatus = "idle" | "uploading" | "processing" | "success" | "error";

export interface ExtractionResult {
  fileName: string;
  fileSize: string;
  transactions: Transaction[];
}
