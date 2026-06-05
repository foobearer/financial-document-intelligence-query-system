import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getRisks } from '../../api/client'
import type { Risk, UploadedDocument } from '../../types'

const SEV_LABELS = ['Minimal', 'Low', 'Moderate', 'High', 'Critical']
const SEV_COLORS = ['#10B981', '#4FC3F7', '#F59E0B', '#F97316', '#EF4444']

function sevStyle(s: number): { bar: string; badge: string; badgeBg: string } {
  if (s >= 5) return { bar: 'border-l-4 border-danger',  badge: 'text-danger',  badgeBg: 'bg-red-50' }
  if (s === 4) return { bar: 'border-l-4 border-orange-500', badge: 'text-orange-500', badgeBg: 'bg-orange-50' }
  if (s === 3) return { bar: 'border-l-4 border-warning', badge: 'text-warning', badgeBg: 'bg-amber-50' }
  if (s === 2) return { bar: 'border-l-4 border-finblue-sky', badge: 'text-finblue-sky', badgeBg: 'bg-sky-50' }
  return { bar: 'border-l-4 border-success', badge: 'text-success', badgeBg: 'bg-emerald-50' }
}

interface Props { document: UploadedDocument }

export default function RisksTab({ document }: Props) {
  const [risks,   setRisks]   = useState<Risk[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setRisks([]); setError(null); setLoading(true)
    getRisks(document.document_id)
      .then(setRisks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [document.document_id])

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-3 text-navy/50">
      <span className="w-5 h-5 border-2 border-finblue/30 border-t-finblue rounded-full animate-spin" />
      Extracting risk factors…
    </div>
  )

  if (error) return (
    <div className="card max-w-md mx-auto mt-10 text-center p-6">
      <p className="text-2xl mb-2">⚠️</p>
      <p className="text-sm text-danger font-medium">{error}</p>
    </div>
  )

  if (risks.length === 0) return (
    <div className="card max-w-sm mx-auto mt-20 text-center p-8">
      <p className="text-3xl mb-3">⚠️</p>
      <p className="font-bold text-navy mb-1">No risks found</p>
      <p className="text-sm text-navy/50">Re-upload with full intelligence extraction enabled.</p>
    </div>
  )

  const counts = SEV_LABELS.map((name, i) => ({
    name,
    count: risks.filter(r => r.severity === i + 1).length,
    fill:  SEV_COLORS[i],
  }))

  const highCount = risks.filter(r => r.severity >= 4).length
  const newCount  = risks.filter(r => r.is_new).length

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-slide-up">

      {/* Header */}
      <div className="card-blue rounded-2xl p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#fa709a,#fee140)', boxShadow: '0 4px 14px rgba(250,112,154,0.35)' }}
        >
          ⚠️
        </div>
        <div>
          <h2 className="font-bold text-navy text-base">Risk Analysis</h2>
          <p className="text-xs text-navy/55 mt-0.5">{document.company_name ?? document.filename} · {risks.length} risks identified</p>
        </div>
        <div className="ml-auto flex gap-2">
          {highCount > 0 && (
            <span className="badge-red">{highCount} high severity</span>
          )}
          {newCount > 0 && (
            <span className="badge-violet">{newCount} new</span>
          )}
        </div>
      </div>

      {/* Summary + chart row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats */}
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest">Severity Breakdown</p>
          {SEV_LABELS.map((label, i) => {
            const c = counts[i].count
            if (c === 0) return null
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SEV_COLORS[i] }} />
                <p className="text-sm text-navy flex-1">{label}</p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: SEV_COLORS[i] + '20', color: SEV_COLORS[i] }}
                >
                  {c}
                </span>
              </div>
            )
          })}
        </div>

        {/* Bar chart */}
        <div className="card md:col-span-2">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-3">Risk Distribution</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={counts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#fff', border: '1px solid #E5E7EB',
                  borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  color: '#0D1B2A', fontSize: 12,
                }}
                cursor={{ fill: 'rgba(26,115,232,0.05)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {counts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk list */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest">All Risk Factors</p>
        {risks.map((risk, i) => {
          const style = sevStyle(risk.severity)
          return (
            <div key={i} className={`card ${style.bar} pl-4`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {risk.is_new && (
                    <span className="badge-violet text-[10px] shrink-0">NEW</span>
                  )}
                  <p className="text-sm font-bold text-navy">{risk.title}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${style.badgeBg} ${style.badge}`}>
                    {SEV_LABELS[risk.severity - 1] ?? `Sev ${risk.severity}`}
                  </span>
                  <span className="text-[10px] text-navy/40 hidden sm:inline">
                    {risk.likelihood} likelihood
                  </span>
                </div>
              </div>
              <p className="text-xs text-navy/60 leading-relaxed">{risk.description}</p>
              <div className="mt-2">
                <span className="badge-blue text-[10px]">{risk.category.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
