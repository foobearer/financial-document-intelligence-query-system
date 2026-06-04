import { useEffect, useState } from 'react'
import { getSentiment } from '../../api/client'
import type { OverallSentiment, SentimentSection, UploadedDocument } from '../../types'

const SENTIMENT_COLORS: Record<string, string> = {
  bullish:   'text-accent',
  cautious:  'text-risk-med',
  neutral:   'text-text-muted',
  bearish:   'text-risk-high',
}

interface Props {
  document: UploadedDocument
}

export default function SentimentTab({ document }: Props) {
  const [overall, setOverall] = useState<OverallSentiment | null>(null)
  const [sections, setSections] = useState<SentimentSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOverall(null)
    setSections([])
    setError(null)
    setLoading(true)
    getSentiment(document.document_id)
      .then(({ overall, by_section }) => {
        setOverall(overall)
        setSections(by_section)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [document.document_id])

  if (loading) return <p className="text-sm text-text-muted">Analysing sentiment...</p>
  if (error) return <p className="text-sm text-risk-high">{error}</p>
  if (!overall) {
    return (
      <p className="text-sm text-text-muted">
        No sentiment data. Re-upload with full intelligence extraction enabled.
      </p>
    )
  }

  const sentimentColor = SENTIMENT_COLORS[overall.overall?.split(' ')[0]?.toLowerCase()] ?? 'text-text-muted'

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-lg font-semibold">
        Sentiment Analysis:{' '}
        <span className="text-accent">{document.company_name ?? document.filename}</span>
      </h2>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-text-muted mb-1">Overall Tone</p>
          <p className={`text-xl font-bold font-display ${sentimentColor}`}>
            {overall.overall.toUpperCase()}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-text-muted mb-1">Sentiment Score</p>
          <p className={`text-xl font-bold ${overall.score >= 0 ? 'text-accent' : 'text-risk-high'}`}>
            {overall.score >= 0 ? '+' : ''}{overall.score.toFixed(2)}
          </p>
          <p className="text-xs text-text-muted">−1 bearish · +1 bullish</p>
        </div>
        <div className="card">
          <p className="text-xs text-text-muted mb-1">Confidence</p>
          <p className="text-xl font-bold text-text-primary">
            {(overall.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="border-t border-border-dim pt-4">
        <p className="text-xs text-text-muted mb-3 uppercase tracking-widest">By Section</p>
        <div className="flex flex-col gap-4">
          {sections.map((s, i) => {
            const color = SENTIMENT_COLORS[s.overall_sentiment] ?? 'text-text-muted'
            return (
              <div key={i} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary">{s.section}</p>
                  {s.key_phrases.length > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      Key phrases: {s.key_phrases.slice(0, 3).join(' · ')}
                    </p>
                  )}
                  {s.notable_language && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Notable: {s.notable_language}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${color}`}>
                    {s.overall_sentiment.toUpperCase()}
                  </p>
                  <p className="text-xs text-text-muted">
                    Score: {s.sentiment_score >= 0 ? '+' : ''}{s.sentiment_score.toFixed(2)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
