import { useRef, useState } from 'react'
import { queryDocument } from '../../api/client'
import type { ChatMessage, Source, UploadedDocument } from '../../types'

interface Props {
  document: UploadedDocument
  chatHistory: ChatMessage[]
  onMessage: (user: string, assistant: string) => void
  prefillQuestion: string
  onClearPrefill: () => void
}

export default function QATab({
  document,
  chatHistory,
  onMessage,
  prefillQuestion,
  onClearPrefill,
}: Props) {
  const [question, setQuestion] = useState('')
  const [sectionFilter, setSectionFilter] = useState('All sections')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [showSources, setShowSources] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function handleAsk(q: string) {
    if (!q.trim() || loading) return
    const filter = sectionFilter === 'All sections' ? undefined : sectionFilter
    setLoading(true)
    setSources([])
    setShowSources(false)
    try {
      const res = await queryDocument(document.document_id, q, filter)
      onMessage(q, res.answer)
      setSources(res.sources)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } finally {
      setLoading(false)
      setQuestion('')
    }
  }

  // Handle prefilled question from sidebar
  if (prefillQuestion && !loading) {
    setQuestion(prefillQuestion)
    onClearPrefill()
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          Q&amp;A:{' '}
          <span className="text-accent">{document.company_name ?? document.filename}</span>
        </h2>

        {document.sections.length > 0 && (
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="input w-auto text-xs"
          >
            <option>All sections</option>
            {document.sections.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 pr-1">
        {chatHistory.length === 0 && (
          <p className="text-sm text-text-muted text-center mt-8">
            Ask anything about this document.
          </p>
        )}
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-bg-primary font-medium'
                  : 'bg-bg-secondary border border-border-dim text-text-primary'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="bg-bg-secondary border border-border-dim px-4 py-3 text-sm text-text-muted">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-xs text-text-muted hover:text-accent transition-colors"
          >
            {showSources ? '▾ Hide sources' : '▸ Show sources'} ({sources.length})
          </button>
          {showSources && (
            <div className="mt-2 flex flex-col gap-1">
              {sources.map((s, i) => (
                <p key={i} className="text-xs text-text-muted">
                  📄 {s.section} — relevance:{' '}
                  <span className="text-accent">{s.relevance.toFixed(2)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk(question)
        }}
        className="flex gap-2"
      >
        <input
          className="input flex-1"
          placeholder="Ask anything about this document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={!question.trim() || loading} className="btn-primary">
          Ask
        </button>
      </form>
    </div>
  )
}
