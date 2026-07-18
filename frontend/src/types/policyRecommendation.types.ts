export type RecommendationStatus = 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';

export interface PolicyRecommendation {
  id: string;
  title: string;
  rationale: string;
  department: string | null;
  confidenceScore: number;
  status: RecommendationStatus;
  generatedAt: string;
  reviewedById: string | null;
  reviewedAt: string | null;
}

export interface PolicyRecommendationModifyInput {
  title: string;
  rationale: string;
}
