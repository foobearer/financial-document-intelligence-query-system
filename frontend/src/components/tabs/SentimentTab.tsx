import { useEffect, useState } from 'react'
import { getSentiment } from '../../api/client'
import type { OverallSentiment, SentimentSection, UploadedDocument } from '../../types'

const SENTIMENT_STYLE: Record<string, { bg: string; text: string; emoji: string }> = {
  bullish:  { bg: 'bg-emerald-50', text: 'text-success',       emoji: '🟢' },
  cautious: { bg: 'bg-amber-50',   text: 'text-warning',       emoji: '🟡' },
  neutral:  { bg: 'bg-gray-100',   text: 'text-navy/60',       emoji: '⚪' },
  bearish:  { bg: 'bg-red-50',     text: 'text-danger',        emoji: '🔴' },
  positive: { bg: 'bg-emerald-50', text: 'text-success',       emoji: '🟢' },
  negative: { bg: 'bg-red-50',     text: 'text-danger',        emoji: '🔴' },
}

function sentStyle(s: string) {
  return SENTIMENT_STYLE[s.toLowerCase().split(' ')[0]] ?? SENTIMENT_STYLE.neutral
}

interface Props { document: UploadedDocument }

export default function SentimentTab({ document }: Props) {
  const [overall,  setOverall]  = useState<OverallSentiment | null>(null)
  const [sections, setSections] = useState<SentimentSection[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setOverall(null); setSections([]); setError(null); setLoading(true)
    getSentiment(document.document_id)
      .then(({ overall, by_section }) => { setOverall(overall); setSections(by_section) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [document.document_id])

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-3 text-navy/50">
      <span className="w-5 h-5 border-2 border-finblue/30 border-t-finblue rounded-full animate-spin" />
      Analysing sentiment…
    </div>
  )

  if (error) return (
    <div className="card max-w-md mx-auto mt-10 text-center p-6">
      <p className="text-2xl mb-2">⚠️</p>
      <p className="text-sm text-danger font-medium">{error}</p>
    </div>
  )

  if (!overall) return (
    <div className="card max-w-sm mx-auto mt-20 text-center p-8">
      <p className="text-3xl mb-3">📈</p>
      <p className="font-bold text-navy mb-1">No sentiment data</p>
      <p className="text-sm text-navy/50">Re-upload with full intelligence extraction enabled.</p>
    </div>
  )

  const ov    = sentStyle(overall.overall)
  const score = overall.score
  const pct   = Math.round(((score + 1) / 2) * 100) // map -1..1 → 0..100

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-slide-up">

      {/* Header */}
      <div className="card-blue rounded-2xl p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#30cfd0,#667eea)', boxShadow: '0 4px 14px rgba(48,207,208,0.35)' }}
        >
          📈
        </div>
        <div>
          <h2 className="font-bold text-navy text-base">Sentiment Analysis</h2>
          <p className="text-xs text-navy/55 mt-0.5">{document.company_name ?? document.filename}</p>
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Tone */}
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest">Overall Tone</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl self-start font-bold text-lg ${ov.bg} ${ov.text}`}>
            <span>{ov.emoji}</span>
            {overall.overall.toUpperCase()}
          </div>
          <p className="text-xs text-navy/45">
            Confidence: <span className="font-semibold text-navy">{(overall.confidence * 100).toFixed(0)}%</span>
          </p>
        </div>

        {/* Sentiment score gauge */}
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest">Sentiment Score</p>
          <p className={`text-3xl font-bold ${score >= 0 ? 'text-success' : 'text-danger'}`}>
            {score >= 0 ? '+' : ''}{score.toFixed(2)}
          </p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: score >= 0.3
                  ? 'linear-gradient(90deg,#10B981,#38ef7d)'
                  : score <= -0.3
                    ? 'linear-gradient(90deg,#EF4444,#fa709a)'
                    : 'linear-gradient(90deg,#F59E0B,#ffd200)',
              }}
            />
          </div>
          <p className="text-[10px] text-navy/35">−1.0 very bearish · +1.0 very bullish</p>
        </div>

        {/* Confidence */}
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest">Model Confidence</p>
          <p className="text-3xl font-bold text-navy">{(overall.confidence * 100).toFixed(0)}%</p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{ width: `${(overall.confidence * 100).toFixed(0)}%`, background: 'linear-gradient(90deg,#1A73E8,#4FC3F7)' }}
            />
          </div>
          <p className="text-[10px] text-navy/35">Based on linguistic analysis</p>
        </div>
      </div>

      {/* Per-section breakdown */}
      {sections.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-4">By Section</p>
          <div className="flex flex-col divide-y divide-gray-100">
            {sections.map((s, i) => {
              const st      = sentStyle(s.overall_sentiment)
              const barPct  = Math.round(((s.sentiment_score + 1) / 2) * 100)
              return (
                <div key={i} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy">{s.section}</p>
                      {s.key_phrases.length > 0 && (
                        <p className="text-xs text-navy/50 mt-0.5">
                          {s.key_phrases.slice(0, 3).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-[11px] font-bold ${st.bg} ${st.text}`}>
                        {st.emoji} {s.overall_sentiment.toUpperCase()}
                      </span>
                      <span className={`text-xs font-bold ${s.sentiment_score >= 0 ? 'text-success' : 'text-danger'}`}>
                        {s.sentiment_score >= 0 ? '+' : ''}{s.sentiment_score.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: s.sentiment_score >= 0.2
                          ? '#10B981'
                          : s.sentiment_score <= -0.2
                            ? '#EF4444'
                            : '#F59E0B',
                      }}
                    />
                  </div>

                  {s.notable_language && (
                    <p className="text-xs text-navy/40 mt-1.5 italic">{s.notable_language}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
