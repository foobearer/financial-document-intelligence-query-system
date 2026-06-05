import type { UploadedDocument } from '../../types'

const FEATURES = [
  {
    emoji: '📤',
    bg:    'linear-gradient(135deg,#4FC3F7,#1A73E8)',
    title: 'Smart Upload',
    desc:  'Upload any SEC filing — 10-K, 10-Q, 8-K, earnings transcript — and let AI parse it instantly.',
  },
  {
    emoji: '💬',
    bg:    'linear-gradient(135deg,#11998e,#38ef7d)',
    title: 'Ask Anything',
    desc:  'RAG-powered Q&A grounded in your document. Ask about revenue, risks, guidance, or any section.',
  },
  {
    emoji: '📊',
    bg:    'linear-gradient(135deg,#f093fb,#f5576c)',
    title: 'Metric Extraction',
    desc:  'Auto-extracts revenue, EPS, margins, debt ratios, cash flow and year-over-year changes.',
  },
  {
    emoji: '⚠️',
    bg:    'linear-gradient(135deg,#fa709a,#fee140)',
    title: 'Risk Scoring',
    desc:  'Identifies and ranks risk factors by severity and likelihood with category classification.',
  },
  {
    emoji: '📈',
    bg:    'linear-gradient(135deg,#30cfd0,#667eea)',
    title: 'Sentiment Analysis',
    desc:  'Per-section tone analysis — bullish, cautious, neutral or bearish — with confidence scoring.',
  },
  {
    emoji: '🔄',
    bg:    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    title: 'Document Compare',
    desc:  'Side-by-side comparison of any two filings — track changes in revenue, risk, and sentiment.',
  },
]

interface Props {
  documents: Record<string, UploadedDocument>
  onGoUpload: () => void
  onGoQA:     () => void
}

export default function HomeTab({ documents, onGoUpload, onGoQA }: Props) {
  const docList  = Object.values(documents)
  const docCount = docList.length
  const hasDoc   = docCount > 0

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-slide-up">

      {/* Hero banner */}
      <div
        className="rounded-3xl p-8 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0D1B2A 0%,#1A3A5C 60%,#1A73E8 100%)' }}
      >
        {/* Decorative blur circles */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#4FC3F7,transparent)', transform: 'translate(30%,-30%)' }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#1A73E8,transparent)', transform: 'translateY(40%)' }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="badge text-[11px] font-bold"
              style={{ background: 'rgba(79,195,247,0.2)', color: '#4FC3F7', border: '1px solid rgba(79,195,247,0.3)' }}
            >
              🤖 AI-Powered
            </span>
          </div>
          <h2 className="text-3xl font-extrabold leading-tight mb-2">
            Financial Document<br />Intelligence Platform
          </h2>
          <p className="text-white/60 text-sm mb-6 max-w-md">
            Upload SEC filings and earnings transcripts. Extract insights, score risks, and ask anything — powered by GPT-4o and RAG.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200
                         hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: '#1A73E8', boxShadow: '0 4px 16px rgba(26,115,232,0.45)', color: '#fff' }}
              onClick={onGoUpload}
            >
              📤 Upload Document
            </button>
            {hasDoc && (
              <button
                className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200
                           hover:scale-[1.03] active:scale-[0.97] border border-white/25 hover:bg-white/10"
                style={{ color: 'white' }}
                onClick={onGoQA}
              >
                💬 Ask a Question
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row (show when docs exist) */}
      {hasDoc && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Documents',    value: docCount,                                emoji: '📁' },
            { label: 'Pages parsed', value: docList.reduce((s,d) => s + d.page_count, 0), emoji: '📄' },
            { label: 'Chunks indexed',value: docList.reduce((s,d) => s + d.chunk_count,0), emoji: '🧩' },
            { label: 'Companies',    value: new Set(docList.map(d => d.company_name).filter(Boolean)).size, emoji: '🏢' },
          ].map(stat => (
            <div key={stat.label} className="card flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                style={{ background: '#EEF4FF' }}
              >
                {stat.emoji}
              </div>
              <div>
                <p className="text-xl font-bold text-navy">{stat.value}</p>
                <p className="text-xs text-navy/50">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent documents */}
      {hasDoc && (
        <div>
          <h3 className="text-sm font-bold text-navy mb-3">Recent Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {docList.slice(-4).reverse().map(doc => (
              <div key={doc.document_id} className="card flex items-center gap-3 cursor-pointer hover:shadow-card-hover">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg,#EEF4FF,#E8F1FD)' }}
                >
                  📄
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">
                    {doc.company_name ?? doc.filename}
                  </p>
                  <p className="text-xs text-navy/50">
                    {doc.doc_type} · {doc.page_count} pages · {doc.chunk_count} chunks
                  </p>
                </div>
                <span
                  className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: '#EEF4FF', color: '#1A73E8' }}
                >
                  {doc.period ?? doc.doc_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature grid */}
      <div>
        <h3 className="text-sm font-bold text-navy mb-3">
          {hasDoc ? 'What you can do' : 'Get started — capabilities'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="card flex flex-col gap-3 hover:shadow-card-hover">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                style={{ background: f.bg, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                {f.emoji}
              </div>
              <div>
                <p className="text-sm font-bold text-navy mb-0.5">{f.title}</p>
                <p className="text-xs text-navy/55 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA when no docs */}
      {!hasDoc && (
        <div className="card-blue p-8 rounded-3xl text-center">
          <p className="text-lg font-bold text-navy mb-2">Ready to analyse your first document?</p>
          <p className="text-sm text-navy/55 mb-5">
            Upload a PDF and get AI-powered insights in seconds.
          </p>
          <button className="btn-primary px-8 py-3 text-base" onClick={onGoUpload}>
            📤 Upload your first document
          </button>
        </div>
      )}

    </div>
  )
}
