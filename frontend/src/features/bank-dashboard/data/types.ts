// =============================================================================
// Customer Types (from banking_churn_customers_1000.csv)
// =============================================================================

export type CreditScoreBucket = 'low' | 'medium' | 'high';

export type Customer = {
  customer_id: string;
  business_name: string;
  segment: string;
  industry: string;
  annual_revenue: number;
  number_of_employees: number;
  loan_amount: number;
  loan_product: string;
  credit_score_bucket: CreditScoreBucket;
  risk_rating: number;
  relationship_length_years: number;
  region: string;
  is_collateralized: boolean;
  interest_rate: number;
  delinquency_count_12m: number;
  loan_outcome: string;
  churn_label: 0 | 1;
  customer_persona: string;
};

// =============================================================================
// Document Types (from banking_churn_documents_1000.csv)
// =============================================================================

export type Document = {
  document_id: string;
  customer_id: string;
  doc_type: string;
  created_at: string;
  title: string;
  language: string;
  format: string;
  content: string;
};

// =============================================================================
// Message Types (from banking_churn_messages_1000.csv)
// =============================================================================

export type MessageRole = 'agent' | 'customer';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export type Message = {
  message_id: string;
  customer_id: string;
  message_time: string;
  channel: string;
  message_role: MessageRole;
  phase_label: string;
  agent_id: string;
  agent_persona: string;
  agent_role: string;
  agent_tone: string;
  sentiment: Sentiment;
  churn_label: 0 | 1;
  loan_outcome: string;
  customer_persona: string;
  text: string;
  referenced_document_ids: string | null;
  thread_id: string;
};

// =============================================================================
// AI Summary Types
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';

export type Token = {
  text: string;
  riskScore: number; // 0 to 1
};

// Streaming token data from the backend (SSE format)
export type StreamingToken = {
  order: number;
  token: string;
  hallucination_prob: number; // 0 to 1
};

export type AiSuggestion = {
  id: string;
  title: string;
  categories: string[];
  confidence: number; // 0 to 1
};

export type AiSummaryResponse = {
  summaryTokens: Token[];
  suggestions: AiSuggestion[];
  riskCommentary: string;
  generatedAt: string; // ISO date string
};

export type AiSummaryStatus = 'idle' | 'loading' | 'success' | 'error';

// =============================================================================
// Dashboard Section Types
// =============================================================================

export type DashboardSection = 
  | 'overview'
  | 'financial'
  | 'relationship'
  | 'journey'
  | 'documents'
  | 'messages'
  | 'risk'
  | 'actions'
  | 'aiSummary';

// =============================================================================
// Helper function to get risk level from score
// =============================================================================

export function getRiskLevel(score: number): RiskLevel {
  if (score < 0.34) return 'low';
  if (score < 0.67) return 'medium';
  return 'high';
}

export function getRiskLevelFromRating(rating: number): RiskLevel {
  // Risk rating is 1-10, where 10 is highest risk
  if (rating <= 3) return 'low';
  if (rating <= 6) return 'medium';
  return 'high';
}

