import { useState } from 'react'
import { compareDocuments } from '../../api/client'
import type { CompareResult, UploadedDocument } from '../../types'

interface Props { documents: Record<string, UploadedDocument> }

function dirEmoji(d: string) {
  if (['up', 'raised', 'improved', 'higher', 'increase'].some(k => d.includes(k))) return '📈'
  if (['down', 'lowered', 'deteriorated', 'lower', 'decrease'].some(k => d.includes(k))) return '📉'
  return '➡️'
}

function dirColor(d: string) {
  if (['up', 'raised', 'improved', 'higher', 'increase'].some(k => d.includes(k))) return 'text-success'
  if (['down', 'lowered', 'deteriorated', 'lower', 'decrease'].some(k => d.includes(k))) return 'text-danger'
  return 'text-navy/60'
}

export default function CompareTab({ documents }: Props) {
  const docList  = Object.values(documents)
  const [doc1Id, setDoc1Id] = useState(docList[0]?.document_id ?? '')
  const [doc2Id, setDoc2Id] = useState(docList[1]?.document_id ?? '')
  const [result,  setResult]  = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function docLabel(doc: UploadedDocument) {
    return `${doc.company_name ?? doc.filename} (${doc.period ?? doc.doc_type})`
  }

  async function handleCompare() {
    if (doc1Id === doc2Id) return
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await compareDocuments(doc1Id, doc2Id, docLabel(documents[doc1Id]), docLabel(documents[doc2Id]))
      if (res.error) throw new Error(res.error)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 animate-slide-up">

      {/* Header */}
      <div className="card-blue rounded-2xl p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', boxShadow: '0 4px 14px rgba(161,140,209,0.35)' }}
        >
          🔄
        </div>
        <div>
          <h2 className="font-bold text-navy text-base">Compare Documents</h2>
          <p className="text-xs text-navy/55 mt-0.5">Side-by-side analysis of two financial filings</p>
        </div>
      </div>

      {/* Doc selectors */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-navy/50 mb-2 block">First document</label>
            <select value={doc1Id} onChange={e => setDoc1Id(e.target.value)} className="select text-sm">
              {docList.map(d => <option key={d.document_id} value={d.document_id}>{docLabel(d)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/50 mb-2 block">Second document</label>
            <select value={doc2Id} onChange={e => setDoc2Id(e.target.value)} className="select text-sm">
              {docList.map(d => <option key={d.document_id} value={d.document_id}>{docLabel(d)}</option>)}
            </select>
          </div>
        </div>

        {doc1Id === doc2Id && (
          <p className="text-xs text-warning mb-3">⚠️ Select two different documents to compare.</p>
        )}

        <button
          onClick={handleCompare}
          disabled={doc1Id === doc2Id || loading}
          className="btn-primary w-full justify-center py-3"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Comparing…
            </>
          ) : (
            '🔄 Compare Documents'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-danger-bg border border-danger/20">
          <span className="text-lg leading-none shrink-0">⚠️</span>
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4 animate-slide-up">

          {/* Executive summary */}
          {result.summary && (
            <div className="card border-l-4 border-finblue">
              <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-2">Executive Summary</p>
              <p className="text-sm text-navy leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Direction cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Revenue',       data: result.revenue_change },
              { label: 'Profitability', data: result.profitability_change },
              { label: 'Risk Profile',  data: result.risk_profile_change },
            ].map(({ label, data }) => data && (
              <div key={label} className="card text-center flex flex-col items-center gap-2">
                <p className="text-[10px] font-semibold text-navy/40 uppercase tracking-widest">{label}</p>
                <p className="text-2xl">{dirEmoji(data.direction)}</p>
                <p className={`text-sm font-bold capitalize ${dirColor(data.direction)}`}>{data.direction}</p>
                <p className="text-[11px] text-navy/50 leading-snug">{data.commentary}</p>
              </div>
            ))}
          </div>

          {/* Sentiment shift */}
          {result.sentiment_shift && (
            <div className="card flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: 'linear-gradient(135deg,#30cfd0,#667eea)' }}
              >
                📈
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-0.5">Sentiment Shift</p>
                <p className="text-sm font-bold text-navy">
                  {result.sentiment_shift.from} → {result.sentiment_shift.to}
                </p>
                {result.sentiment_shift.commentary && (
                  <p className="text-xs text-navy/55 mt-0.5">{result.sentiment_shift.commentary}</p>
                )}
              </div>
            </div>
          )}

          {/* New risks + resolved */}
          <div className="grid grid-cols-2 gap-4">
            {result.new_risks && result.new_risks.length > 0 && (
              <div className="card">
                <p className="text-xs font-semibold text-danger mb-2 flex items-center gap-1.5">
                  <span>🆕</span> New Risk Factors
                </p>
                <ul className="flex flex-col gap-1.5">
                  {result.new_risks.map((r, i) => (
                    <li key={i} className="text-xs text-navy/65 flex gap-1.5">
                      <span className="text-danger shrink-0">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.resolved_risks && result.resolved_risks.length > 0 && (
              <div className="card">
                <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1.5">
                  <span>✅</span> Resolved Risks
                </p>
                <ul className="flex flex-col gap-1.5">
                  {result.resolved_risks.map((r, i) => (
                    <li key={i} className="text-xs text-navy/65 flex gap-1.5">
                      <span className="text-success shrink-0">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Guidance change */}
          {result.guidance_change && (
            <div className="card flex items-center gap-3">
              <span className="text-2xl">{dirEmoji(result.guidance_change.direction)}</span>
              <div>
                <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest">Guidance</p>
                <p className="text-sm text-navy leading-snug">{result.guidance_change.commentary}</p>
              </div>
            </div>
          )}

          {/* Key themes */}
          {result.key_themes && result.key_themes.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-3">Key Themes</p>
              <div className="flex flex-wrap gap-2">
                {result.key_themes.map((t, i) => <span key={i} className="badge-blue">{t}</span>)}
              </div>
            </div>
          )}

          {/* Analyst note */}
          {result.analyst_note && (
            <div className="card border-l-4 border-finblue">
              <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-2">Analyst Note</p>
              <p className="text-sm text-navy leading-relaxed">{result.analyst_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
