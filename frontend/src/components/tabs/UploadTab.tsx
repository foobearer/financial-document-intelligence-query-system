import { useState } from 'react'
import { uploadDocument } from '../../api/client'
import type { UploadedDocument } from '../../types'

interface Props {
  onUpload: (doc: UploadedDocument) => void
}

export default function UploadTab({ onUpload }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [runIntelligence, setRunIntelligence] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadedDocument | null>(null)

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

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="font-display text-lg font-semibold mb-1">Upload a Financial Document</h2>
        <p className="text-xs text-text-muted">
          Supports: SEC 10-K, 10-Q, 8-K · Earnings transcripts · Analyst reports
        </p>
      </div>

      {/* File drop zone */}
      <label className="card border-dashed cursor-pointer hover:border-accent transition-colors flex flex-col items-center justify-center gap-2 py-10">
        <span className="text-3xl">📄</span>
        <span className="text-sm text-text-muted">
          {file ? file.name : 'Click to select a PDF'}
        </span>
        {file && (
          <span className="text-xs text-text-muted">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        )}
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
            setError(null)
          }}
        />
      </label>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={runIntelligence}
          onChange={(e) => setRunIntelligence(e.target.checked)}
          className="accent-accent w-4 h-4"
        />
        <span className="text-sm text-text-primary">Full intelligence extraction</span>
        <span className="text-xs text-text-muted">(metrics, risks, sentiment — slower)</span>
      </label>

      <button
        onClick={handleProcess}
        disabled={!file || loading}
        className="btn-primary self-start"
      >
        {loading ? 'Processing...' : 'Process Document →'}
      </button>

      {error && (
        <div className="border border-risk-high bg-risk-high/10 px-4 py-3 text-sm text-risk-high">
          {error}
        </div>
      )}

      {result && (
        <div className="card">
          <p className="text-xs text-accent font-bold mb-3">✅ Processed: {result.filename}</p>
          <pre className="text-xs text-text-muted overflow-auto">
            {JSON.stringify(
              {
                document_id: result.document_id,
                type: result.doc_type,
                company: result.company_name,
                period: result.period,
                pages: result.page_count,
                chunks: result.chunk_count,
                sections: result.sections,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  )
}
