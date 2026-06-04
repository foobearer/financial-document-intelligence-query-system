import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getRisks } from '../../api/client'
import type { Risk, UploadedDocument } from '../../types'

const SEVERITY_LABELS = ['Minimal', 'Low', 'Moderate', 'High', 'Critical']
const SEVERITY_COLORS = ['#00ff9d', '#7c6af7', '#ff9d00', '#ff8c00', '#ff4444']

function severityClass(s: number) {
  if (s >= 4) return 'border-l-4 border-risk-high pl-3'
  if (s === 3) return 'border-l-4 border-risk-med pl-3'
  return 'border-l-4 border-risk-low pl-3'
}

interface Props {
  document: UploadedDocument
}

export default function RisksTab({ document }: Props) {
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRisks([])
    setError(null)
    setLoading(true)
    getRisks(document.document_id)
      .then(setRisks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [document.document_id])

  if (loading) return <p className="text-sm text-text-muted">Extracting risk factors...</p>
  if (error) return <p className="text-sm text-risk-high">{error}</p>
  if (risks.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No risks extracted. Re-upload with full intelligence extraction enabled.
      </p>
    )
  }

  const counts = SEVERITY_LABELS.map((name, i) => ({
    name,
    count: risks.filter((r) => r.severity === i + 1).length,
  }))

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-lg font-semibold">
        Risk Factors:{' '}
        <span className="text-accent">{document.company_name ?? document.filename}</span>
      </h2>

      {/* Severity chart */}
      <div className="card h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={counts} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#7a7a9a', fontSize: 11 }} />
            <YAxis tick={{ fill: '#7a7a9a', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#111118', border: '1px solid #2a2a3a', color: '#e8e8f0' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {counts.map((_, i) => (
                <Cell key={i} fill={SEVERITY_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk list */}
      <div className="flex flex-col gap-4">
        {risks.map((risk, i) => (
          <div key={i} className={severityClass(risk.severity)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-text-primary">
                {risk.is_new && (
                  <span className="text-xs bg-purple text-white px-1 mr-1">NEW</span>
                )}
                {risk.title}
              </span>
              <span className="text-xs text-text-muted">
                Severity: {risk.severity}/5 · {risk.likelihood} likelihood ·{' '}
                {risk.category.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">{risk.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
