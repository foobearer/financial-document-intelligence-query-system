export interface UploadedDocument {
  document_id: string
  filename: string
  doc_type: string
  company_name: string | null
  period: string | null
  page_count: number
  chunk_count: number
  sections: string[]
  status: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Source {
  section: string
  relevance: number
}

export interface QueryResponse {
  answer: string
  sources: Source[]
  model: string
}

export interface MetricValue {
  value: number | null
  unit: string
  period?: string | null
  yoy_change_pct?: number | null
}

export interface Metrics {
  revenue?: MetricValue
  net_income?: MetricValue
  eps_diluted?: MetricValue
  gross_margin?: MetricValue
  operating_margin?: MetricValue
  debt_to_equity?: MetricValue
  cash_and_equivalents?: MetricValue
  free_cash_flow?: MetricValue
  guidance_revenue?: MetricValue
  shares_outstanding?: MetricValue
  document_period?: string | null
  company_name?: string | null
  filing_type?: string | null
}

export interface Risk {
  title: string
  description: string
  category: string
  severity: number
  likelihood: string
  is_new: boolean
}

export interface SentimentSection {
  section: string
  overall_sentiment: string
  confidence: number
  sentiment_score: number
  key_phrases: string[]
  forward_looking_tone: string
  management_confidence: string
  notable_language: string | null
}

export interface OverallSentiment {
  overall: string
  score: number
  confidence: number
}

export interface CompareResult {
  summary?: string
  revenue_change?: { direction: string; magnitude?: string; commentary: string }
  profitability_change?: { direction: string; commentary: string }
  risk_profile_change?: { direction: string; commentary: string }
  new_risks?: string[]
  resolved_risks?: string[]
  guidance_change?: { direction: string; commentary: string }
  sentiment_shift?: { from: string; to: string; commentary: string }
  key_themes?: string[]
  analyst_note?: string
  error?: string
}
