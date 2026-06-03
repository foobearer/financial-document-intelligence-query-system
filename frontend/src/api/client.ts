import type {
  UploadedDocument, QueryResponse, Metrics,
  Risk, SentimentSection, OverallSentiment, CompareResult,
} from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

export async function uploadDocument(file: File, runIntelligence: boolean): Promise<UploadedDocument> {
  const form = new FormData()
  form.append('file', file)
  form.append('run_intelligence', String(runIntelligence))
  return request('/documents/upload', { method: 'POST', body: form })
}

export async function queryDocument(
  documentId: string,
  question: string,
  sectionFilter?: string,
): Promise<QueryResponse> {
  return request('/documents/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: documentId,
      question,
      section_filter: sectionFilter ?? null,
    }),
  })
}

export async function getMetrics(documentId: string): Promise<Metrics> {
  const res = await request<{ document_id: string; metrics: Metrics }>(
    `/documents/${documentId}/metrics`,
  )
  return res.metrics
}

export async function getRisks(documentId: string): Promise<Risk[]> {
  const res = await request<{ document_id: string; risks: Risk[]; total: number }>(
    `/documents/${documentId}/risks`,
  )
  return res.risks
}

export async function getSentiment(
  documentId: string,
): Promise<{ overall: OverallSentiment; by_section: SentimentSection[] }> {
  const res = await request<{
    document_id: string
    overall: OverallSentiment
    by_section: SentimentSection[]
  }>(`/documents/${documentId}/sentiment`)
  return { overall: res.overall, by_section: res.by_section }
}

export async function compareDocuments(
  documentId1: string,
  documentId2: string,
  label1: string,
  label2: string,
): Promise<CompareResult> {
  return request('/documents/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id_1: documentId1,
      document_id_2: documentId2,
      label_1: label1,
      label_2: label2,
    }),
  })
}
