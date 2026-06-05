import { useState } from 'react'
import { uploadDocument } from '../../api/client'
import type { UploadedDocument } from '../../types'

interface Props {
  onUpload: (doc: UploadedDocument) => void
}

export default function UploadTab({ onUpload }: Props) {
  const [file,            setFile]            = useState<File | null>(null)
  const [runIntelligence, setRunIntelligence] = useState(true)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [result,          setResult]          = useState<UploadedDocument | null>(null)
  const [dragging,        setDragging]        = useState(false)

  async function handleProcess() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const doc = await uploadDocument(file, runIntelligence)
      setResult(doc)
      onUpload(doc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setResult(null)
      setError(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-slide-up">

      {/* Header card */}
      <div className="card-blue rounded-2xl p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#4FC3F7,#1A73E8)', boxShadow: '0 4px 14px rgba(26,115,232,0.35)' }}
        >
          📤
        </div>
        <div>
          <h2 className="font-bold text-navy text-base">Upload Financial Document</h2>
          <p className="text-xs text-navy/55 mt-0.5">SEC 10-K · 10-Q · 8-K · Earnings transcripts · Analyst reports</p>
        </div>
      </div>

      {/* Drop zone */}
      <label
        className={`relative flex flex-col items-center justify-center gap-3 py-14 px-6
                    rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${dragging
                      ? 'border-finblue bg-finblue-tint scale-[1.01]'
                      : file
                        ? 'border-success bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-finblue hover:bg-finblue-pale'
                    }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
          style={{
            background: file ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#EEF4FF,#E8F1FD)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {file ? '✅' : '📄'}
        </div>

        {file ? (
          <div className="text-center">
            <p className="font-semibold text-navy text-sm">{file.name}</p>
            <p className="text-xs text-navy/50 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to process</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-semibold text-navy text-sm">Drop your PDF here</p>
            <p className="text-xs text-navy/45 mt-1">or click to browse files</p>
          </div>
        )}

        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null) }}
        />
      </label>

      {/* Options + CTA */}
      <div className="card flex items-center gap-4">
        <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                        transition-all duration-200 cursor-pointer
                        ${runIntelligence ? 'bg-finblue border-finblue' : 'border-gray-300 bg-white'}`}
            onClick={() => setRunIntelligence(v => !v)}
          >
            {runIntelligence && <span className="text-white text-[11px] font-bold leading-none">✓</span>}
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Full intelligence extraction</p>
            <p className="text-xs text-navy/45">Metrics · Risks · Sentiment — ~30–60 s</p>
          </div>
        </label>

        <button onClick={handleProcess} disabled={!file || loading} className="btn-primary shrink-0">
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            '→ Process'
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

      {/* Success */}
      {result && (
        <div className="card border border-success/20 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg,#d1fae5,#6ee7b7)' }}
            >
              ✅
            </div>
            <div>
              <p className="text-sm font-bold text-navy">Successfully processed</p>
              <p className="text-xs text-navy/50">{result.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Document type', value: result.doc_type },
              { label: 'Company',       value: result.company_name ?? '—' },
              { label: 'Period',        value: result.period ?? '—' },
              { label: 'Pages',         value: String(result.page_count) },
              { label: 'Chunks',        value: String(result.chunk_count) },
              { label: 'Sections',      value: String(result.sections.length) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-app-bg rounded-xl px-3 py-2">
                <p className="text-[10px] text-navy/40 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-navy truncate">{value}</p>
              </div>
            ))}
          </div>

          {result.sections.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-navy/40 uppercase tracking-wide mb-2">Sections detected</p>
              <div className="flex flex-wrap gap-1.5">
                {result.sections.map(s => (
                  <span key={s} className="badge-blue text-[11px]">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
