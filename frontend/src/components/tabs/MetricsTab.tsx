import { useEffect, useState } from 'react'
import { getMetrics } from '../../api/client'
import type { Metrics, UploadedDocument } from '../../types'

const KEY_METRICS = [
  { key: 'revenue',     label: 'Revenue' },
  { key: 'net_income',  label: 'Net Income' },
  { key: 'eps_diluted', label: 'EPS (diluted)' },
  { key: 'gross_margin', label: 'Gross Margin' },
] as const

function formatValue(value: number, unit: string): string {
  if (unit.includes('ratio')) return `${(value * 100).toFixed(1)}%`
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  document: UploadedDocument
}

export default function MetricsTab({ document }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMetrics(null)
    setError(null)
    setLoading(true)
    getMetrics(document.document_id)
      .then(setMetrics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [document.document_id])

  if (loading) return <p className="text-sm text-text-muted">Extracting metrics...</p>
  if (error) return <p className="text-sm text-risk-high">{error}</p>
  if (!metrics) return null

  const hasData = KEY_METRICS.some((m) => metrics[m.key]?.value != null)
  if (!hasData) {
    return (
      <p className="text-sm text-text-muted">
        No metrics extracted. Re-upload with full intelligence extraction enabled.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-lg font-semibold">
        Financial Metrics:{' '}
        <span className="text-accent">{document.company_name ?? document.filename}</span>
      </h2>

      {/* Key metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KEY_METRICS.map(({ key, label }) => {
          const m = metrics[key]
          const display =
            m?.value != null ? `${formatValue(m.value, m.unit)} ${m.unit}`.trim() : 'N/A'
          return (
            <div key={key} className="card flex flex-col gap-1">
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-lg font-bold text-text-primary truncate">{display}</p>
              {m?.period && <p className="text-xs text-text-muted">{m.period}</p>}
              {m?.yoy_change_pct != null && (
                <p
                  className={`text-xs font-bold ${m.yoy_change_pct >= 0 ? 'text-accent' : 'text-risk-high'}`}
                >
                  {m.yoy_change_pct >= 0 ? '+' : ''}
                  {m.yoy_change_pct.toFixed(1)}% YoY
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-border-dim pt-4">
        <p className="text-xs text-text-muted mb-2 uppercase tracking-widest">Full Extracted Data</p>
        <pre className="card text-xs text-text-muted overflow-auto max-h-80">
          {JSON.stringify(metrics, null, 2)}
        </pre>
      </div>
    </div>
  )
}
