import { useEffect, useState } from 'react'
import { getMetrics } from '../../api/client'
import type { Metrics, UploadedDocument } from '../../types'

const KEY_METRICS = [
  { key: 'revenue',      label: 'Revenue',        emoji: '💰', color: 'linear-gradient(135deg,#4FC3F7,#1A73E8)' },
  { key: 'net_income',   label: 'Net Income',      emoji: '📈', color: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { key: 'eps_diluted',  label: 'EPS (Diluted)',   emoji: '💲', color: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { key: 'gross_margin', label: 'Gross Margin',    emoji: '📊', color: 'linear-gradient(135deg,#fa709a,#fee140)' },
  { key: 'operating_margin', label: 'Op. Margin',  emoji: '⚙️', color: 'linear-gradient(135deg,#30cfd0,#667eea)' },
  { key: 'free_cash_flow',   label: 'Free Cash Flow', emoji: '🏦', color: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
  { key: 'debt_to_equity',   label: 'Debt / Equity',  emoji: '⚖️', color: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  { key: 'cash_and_equivalents', label: 'Cash', emoji: '💵', color: 'linear-gradient(135deg,#56ab2f,#a8e063)' },
] as const

function fmt(value: number, unit: string): string {
  if (unit.includes('ratio') || unit.includes('%')) return `${(value * 100).toFixed(1)}%`
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props { document: UploadedDocument }

export default function MetricsTab({ document }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setMetrics(null); setError(null); setLoading(true)
    getMetrics(document.document_id)
      .then(setMetrics)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [document.document_id])

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-3 text-navy/50">
      <span className="w-5 h-5 border-2 border-finblue/30 border-t-finblue rounded-full animate-spin" />
      Extracting financial metrics…
    </div>
  )

  if (error) return (
    <div className="card max-w-md mx-auto mt-10 text-center p-6">
      <p className="text-2xl mb-2">⚠️</p>
      <p className="text-sm text-danger font-medium">{error}</p>
    </div>
  )

  if (!metrics) return null

  const hasData = KEY_METRICS.some(m => metrics[m.key]?.value != null)
  if (!hasData) return (
    <div className="card max-w-sm mx-auto mt-20 text-center p-8">
      <p className="text-3xl mb-3">📊</p>
      <p className="font-bold text-navy mb-1">No metrics found</p>
      <p className="text-sm text-navy/50">Re-upload with full intelligence extraction enabled.</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-slide-up">

      {/* Header */}
      <div className="card-blue rounded-2xl p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)', boxShadow: '0 4px 14px rgba(240,147,251,0.35)' }}
        >
          📊
        </div>
        <div>
          <h2 className="font-bold text-navy text-base">Financial Metrics</h2>
          <p className="text-xs text-navy/55 mt-0.5">
            {document.company_name ?? document.filename}
            {metrics.document_period ? ` · ${metrics.document_period}` : ''}
          </p>
        </div>
        {metrics.filing_type && (
          <span className="ml-auto badge-blue">{metrics.filing_type}</span>
        )}
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KEY_METRICS.map(({ key, label, emoji, color }) => {
          const m = metrics[key]
          const hasVal = m?.value != null
          const display = hasVal ? `${fmt(m!.value!, m!.unit)} ${m!.unit}`.trim() : '—'
          const yoy     = m?.yoy_change_pct

          return (
            <div key={key} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: color, boxShadow: '0 3px 10px rgba(0,0,0,0.15)' }}
                >
                  {emoji}
                </div>
                {yoy != null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    yoy >= 0 ? 'bg-emerald-50 text-success' : 'bg-red-50 text-danger'
                  }`}>
                    {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy).toFixed(1)}%
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] text-navy/45 font-medium">{label}</p>
                <p className={`text-lg font-bold truncate ${hasVal ? 'text-navy' : 'text-navy/25'}`}>
                  {display}
                </p>
                {m?.period && <p className="text-[10px] text-navy/35 mt-0.5">{m.period}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Full raw data */}
      <div className="card">
        <details>
          <summary className="text-xs font-semibold text-navy/50 uppercase tracking-widest cursor-pointer hover:text-navy transition-colors">
            Full extracted data ▸
          </summary>
          <pre className="mt-3 text-xs text-navy/60 overflow-auto max-h-72 bg-app-bg rounded-xl p-3 leading-relaxed">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
