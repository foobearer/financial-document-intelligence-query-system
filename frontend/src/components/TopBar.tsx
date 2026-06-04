import type { Tab } from '../App'
import type { UploadedDocument } from '../types'

const PAGE_META: Record<Tab, { label: string; emoji: string; desc: string }> = {
  home:      { label: 'Overview',       emoji: '🏠', desc: 'Your financial intelligence dashboard' },
  upload:    { label: 'Upload Document',emoji: '📤', desc: 'Process a new SEC filing or earnings report' },
  qa:        { label: 'Ask AI',         emoji: '💬', desc: 'Ask anything about your document' },
  metrics:   { label: 'Financial Metrics',emoji:'📊', desc: 'Extracted key performance indicators' },
  risks:     { label: 'Risk Analysis',  emoji: '⚠️', desc: 'Scored risk factors from the filing' },
  sentiment: { label: 'Sentiment',      emoji: '📈', desc: 'Tone and language analysis by section' },
  compare:   { label: 'Compare',        emoji: '🔄', desc: 'Side-by-side comparison of two documents' },
}

interface Props {
  activeTab:   Tab
  documents:   Record<string, UploadedDocument>
  activeDocId: string | null
  onSelectDoc: (id: string) => void
}

export default function TopBar({ activeTab, documents, activeDocId, onSelectDoc }: Props) {
  const meta    = PAGE_META[activeTab]
  const docList = Object.values(documents)
  const showDocPicker = ['qa', 'metrics', 'risks', 'sentiment'].includes(activeTab) && docList.length > 0

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-4 shrink-0 shadow-sm">
      {/* Page title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl leading-none">{meta.emoji}</span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-navy leading-none truncate">{meta.label}</h1>
          <p className="text-[11px] text-navy/40 mt-0.5 leading-none hidden sm:block">{meta.desc}</p>
        </div>
      </div>

      {/* Document picker */}
      {showDocPicker && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-navy/40 hidden md:block">Active doc:</span>
          <select
            value={activeDocId ?? ''}
            onChange={e => onSelectDoc(e.target.value)}
            className="select w-auto text-xs py-1.5 px-3 rounded-full border-finblue/30 max-w-[200px]"
          >
            {docList.map(doc => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.company_name ?? doc.filename} {doc.period ? `(${doc.period})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Right spacer / status */}
      {!showDocPicker && (
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
            <span className="text-[11px] font-semibold text-success">API online</span>
          </div>
        </div>
      )}
    </header>
  )
}
