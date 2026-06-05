import type { Tab } from '../App'
import type { UploadedDocument } from '../types'

const SAMPLE_QUESTIONS = [
	'What were the main revenue drivers?',
	'What are the top 3 risk factors?',
	'How did gross margin change YoY?',
	"What is management's Q4 outlook?",
	'Summarise the key financial highlights.',
]

interface NavEntry {
	id: Tab
	label: string
	emoji: string
	bg: string
	minDocs?: number
}

const NAV: NavEntry[] = [
	{ id: 'home',      label: 'Overview',     emoji: '🏠', bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
	{ id: 'upload',    label: 'Upload Doc',   emoji: '📤', bg: 'linear-gradient(135deg,#4FC3F7,#1A73E8)' },
	{ id: 'qa',        label: 'Ask AI',       emoji: '💬', bg: 'linear-gradient(135deg,#11998e,#38ef7d)' },
	{ id: 'metrics',   label: 'Metrics',      emoji: '📊', bg: 'linear-gradient(135deg,#f093fb,#f5576c)' },
	{ id: 'risks',     label: 'Risk Analysis',emoji: '⚠️', bg: 'linear-gradient(135deg,#fa709a,#fee140)' },
	{ id: 'sentiment', label: 'Sentiment',    emoji: '📈', bg: 'linear-gradient(135deg,#30cfd0,#667eea)' },
	{ id: 'compare',   label: 'Compare',      emoji: '🔄', bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', minDocs: 2 },
]

interface Props {
	activeTab:        Tab
	onTabChange:      (tab: Tab) => void
	documents:        Record<string, UploadedDocument>
	activeDocId:      string | null
	onSelectDoc:      (id: string) => void
	onSampleQuestion: (q: string) => void
}

export default function Sidebar({
  	activeTab, onTabChange, documents, activeDocId, onSelectDoc, onSampleQuestion,
}: Props) {
	const docList  = Object.values(documents)
	const docCount = docList.length

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-screen overflow-y-auto"
      style={{ background: 'linear-gradient(180deg,#0D1B2A 0%,#112240 100%)' }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-icon shrink-0"
          style={{ background: 'linear-gradient(135deg,#1A73E8,#4FC3F7)' }}
        >
          🏦
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">FinDocIQ</p>
          <p className="text-[10px] mt-0.5 leading-none" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Document Intelligence
          </p>
        </div>
      </div>

      {/* User chip */}
      <div
        className="mx-4 mb-5 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg,#1A73E8,#4FC3F7)' }}
        >
          J
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">Joycee Paragas 😅</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.38)' }}>AI ENGINEER </p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-success shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="px-3 flex flex-col gap-0.5">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
          style={{ color: 'rgba(255,255,255,0.28)' }}
        >
          Navigation
        </p>

        {NAV.map(({ id, label, emoji, bg, minDocs }) => {
          const disabled = minDocs !== undefined && docCount < minDocs
          const active   = activeTab === id
          return (
            <button
              key={id}
              onClick={() => !disabled && onTabChange(id)}
              disabled={disabled}
              className={`nav-item w-full text-left ${active ? 'nav-active' : 'nav-inactive'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[15px] shrink-0"
                style={{ background: bg, boxShadow: '0 3px 10px rgba(0,0,0,0.20)' }}
              >
                {emoji}
              </div>
              <span className="text-sm">{label}</span>
              {minDocs !== undefined && docCount < minDocs && (
                <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {docCount}/{minDocs}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Uploaded documents */}
      {docList.length > 0 && (
        <div className="px-3 mt-5">
          <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Documents ({docList.length})
          </p>
          <div className="flex flex-col gap-0.5">
            {docList.map(doc => {
              const isActive = doc.document_id === activeDocId
              return (
                <button
                  key={doc.document_id}
                  onClick={() => onSelectDoc(doc.document_id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all duration-200 ${
                    isActive ? 'text-finblue-sky' : 'hover:bg-white/5'
                  }`}
                  style={isActive ? { background: 'rgba(26,115,232,0.15)' } : undefined}
                >
                  <p className="text-xs font-semibold truncate" style={{ color: isActive ? '#4FC3F7' : 'rgba(255,255,255,0.60)' }}>
                    {doc.company_name ?? doc.filename}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    {doc.period ?? doc.doc_type}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Sample questions */}
      {docList.length > 0 && (
        <div className="px-3 mt-4">
          <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Try asking
          </p>
          <div className="flex flex-col gap-0.5">
            {SAMPLE_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => onSampleQuestion(q)}
                className="text-left px-2 py-1.5 rounded-lg text-[11px] leading-snug
                           transition-all duration-150 hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.42)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.80)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.42)')}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-5 py-5">
        <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Built by{' '}
          <a
            href="https://joycee.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors"
            style={{ color: 'rgba(79,195,247,0.65)' }}
          >
            JOYCEE CATAMORA PARAGAS
          </a>
        </p>
      </div>
    </aside>
  )
}
