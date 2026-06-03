import { useState } from 'react'
import { compareDocuments } from '../../api/client'
import type { CompareResult, UploadedDocument } from '../../types'

interface Props {
  documents: Record<string, UploadedDocument>
}

function directionEmoji(d: string) {
  if (d === 'up' || d === 'raised' || d === 'improved') return '📈'
  if (d === 'down' || d === 'lowered' || d === 'deteriorated') return '📉'
  return '➡'
}

export default function CompareTab({ documents }: Props) {
  const docList = Object.values(documents)
  const [doc1Id, setDoc1Id] = useState(docList[0]?.document_id ?? '')
  const [doc2Id, setDoc2Id] = useState(docList[1]?.document_id ?? '')
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function docLabel(doc: UploadedDocument) {
    return `${doc.company_name ?? doc.filename} (${doc.period ?? doc.doc_type})`
  }

  async function handleCompare() {
    if (doc1Id === doc2Id) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const doc1 = documents[doc1Id]
      const doc2 = documents[doc2Id]
      const res = await compareDocuments(doc1Id, doc2Id, docLabel(doc1), docLabel(doc2))
      if (res.error) throw new Error(res.error)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  if (docList.length < 2) {
    return <p className="text-sm text-text-muted">Upload at least two documents to compare them.</p>
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="font-display text-lg font-semibold mb-1">Compare Two Documents</h2>
        <p className="text-xs text-text-muted">
          Upload two documents (e.g. Q1 2024 and Q1 2025) and compare them side by side.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-text-muted mb-1 block">First document</label>
          <select value={doc1Id} onChange={(e) => setDoc1Id(e.target.value)} className="input">
            {docList.map((d) => (
              <option key={d.document_id} value={d.document_id}>
                {docLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Second document</label>
          <select value={doc2Id} onChange={(e) => setDoc2Id(e.target.value)} className="input">
            {docList.map((d) => (
              <option key={d.document_id} value={d.document_id}>
                {docLabel(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {doc1Id === doc2Id && (
        <p className="text-xs text-risk-med">Select two different documents.</p>
      )}

      <button
        onClick={handleCompare}
        disabled={doc1Id === doc2Id || loading}
        className="btn-primary self-start"
      >
        {loading ? 'Comparing...' : 'Compare Documents →'}
      </button>

      {error && (
        <div className="border border-risk-high bg-risk-high/10 px-4 py-3 text-sm text-risk-high">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          {result.summary && (
            <div className="card border-l-4 border-accent">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-widest">Executive Summary</p>
              <p className="text-sm text-text-primary leading-relaxed">{result.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {result.revenue_change && (
              <div className="card">
                <p className="text-xs text-text-muted mb-1">Revenue</p>
                <p className="text-lg font-bold">
                  {directionEmoji(result.revenue_change.direction)}{' '}
                  {result.revenue_change.direction}
                </p>
                {result.revenue_change.magnitude && (
                  <p className="text-xs text-text-muted">{result.revenue_change.magnitude}</p>
                )}
              </div>
            )}
            {result.profitability_change && (
              <div className="card">
                <p className="text-xs text-text-muted mb-1">Profitability</p>
                <p className="text-lg font-bold">
                  {directionEmoji(result.profitability_change.direction)}{' '}
                  {result.profitability_change.direction}
                </p>
              </div>
            )}
            {result.sentiment_shift && (
              <div className="card">
                <p className="text-xs text-text-muted mb-1">Sentiment</p>
                <p className="text-sm font-bold">
                  {result.sentiment_shift.from} → {result.sentiment_shift.to}
                </p>
              </div>
            )}
          </div>

          {result.new_risks && result.new_risks.length > 0 && (
            <div>
              <p className="text-xs font-bold text-risk-high mb-2">🆕 New Risk Factors</p>
              <ul className="flex flex-col gap-1">
                {result.new_risks.map((r, i) => (
                  <li key={i} className="text-sm text-text-muted">— {r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.resolved_risks && result.resolved_risks.length > 0 && (
            <div>
              <p className="text-xs font-bold text-accent mb-2">✅ Resolved Risks</p>
              <ul className="flex flex-col gap-1">
                {result.resolved_risks.map((r, i) => (
                  <li key={i} className="text-sm text-text-muted">— {r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.analyst_note && (
            <div className="card border-l-4 border-accent">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-widest">Analyst Note</p>
              <p className="text-sm text-text-primary leading-relaxed">{result.analyst_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
