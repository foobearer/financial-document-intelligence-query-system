import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { queryDocument } from '../../api/client'
import type { ChatMessage, Source, UploadedDocument } from '../../types'

interface Props {
  document:        UploadedDocument
  chatHistory:     ChatMessage[]
  onMessage:       (user: string, assistant: string) => void
  prefillQuestion: string
  onClearPrefill:  () => void
}

export default function QATab({ document, chatHistory, onMessage, prefillQuestion, onClearPrefill }: Props) {
  const [question,      setQuestion]      = useState('')
  const [sectionFilter, setSectionFilter] = useState('All sections')
  const [loading,       setLoading]       = useState(false)
  const [sources,       setSources]       = useState<Source[]>([])
  const [showSources,   setShowSources]   = useState(false)
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

  if (prefillQuestion && !loading) {
    setQuestion(prefillQuestion)
    onClearPrefill()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-3xl mx-auto gap-4 animate-slide-up">

      {/* Doc info bar */}
      <div className="card-blue rounded-2xl px-4 py-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
          style={{ background: 'linear-gradient(135deg,#11998e,#38ef7d)', boxShadow: '0 3px 10px rgba(17,153,142,0.30)' }}
        >
          💬
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy truncate">
            {document.company_name ?? document.filename}
          </p>
          <p className="text-[11px] text-navy/50">{document.doc_type} · {document.page_count} pages · {document.chunk_count} chunks</p>
        </div>
        {document.sections.length > 0 && (
          <select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            className="select w-auto text-xs py-1.5 px-3 rounded-full border-finblue/20 max-w-[160px]"
          >
            <option>All sections</option>
            {document.sections.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 py-2 pr-1">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg,#EEF4FF,#E8F1FD)', boxShadow: '0 4px 16px rgba(26,115,232,0.10)' }}
            >
              💬
            </div>
            <p className="font-semibold text-navy">Ask anything about this document</p>
            <p className="text-sm text-navy/45 max-w-xs">
              Try asking about revenue, risks, management outlook, or any specific financial metric.
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#1A73E8,#4FC3F7)' }}
              >
                🤖
              </div>
            )}

            {msg.role === 'user' ? (
              <div className="bubble-user">{msg.content}</div>
            ) : (
              <div className="bubble-ai prose-ai">
                <ReactMarkdown
                  components={{
                    p:      ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-navy">{children}</strong>,
                    em:     ({ children }) => <em className="italic text-navy/80">{children}</em>,
                    ol:     ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2 space-y-1">{children}</ol>,
                    ul:     ({ children }) => <ul className="list-disc list-outside pl-5 mb-2 space-y-1">{children}</ul>,
                    li:     ({ children }) => <li className="leading-relaxed">{children}</li>,
                    h1:     ({ children }) => <h1 className="text-base font-bold text-navy mt-3 mb-1">{children}</h1>,
                    h2:     ({ children }) => <h2 className="text-sm font-bold text-navy mt-3 mb-1">{children}</h2>,
                    h3:     ({ children }) => <h3 className="text-sm font-semibold text-navy mt-2 mb-1">{children}</h3>,
                    code:   ({ children }) => (
                      <code className="bg-finblue-pale text-finblue text-[11px] px-1.5 py-0.5 rounded-md font-mono">
                        {children}
                      </code>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-finblue/30 pl-3 italic text-navy/60 my-2">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="border-gray-100 my-2" />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#1A73E8,#4FC3F7)' }}
            >
              🤖
            </div>
            <div className="bubble-ai flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-navy/20 border-t-finblue rounded-full animate-spin" />
              <span className="text-navy/50">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="card py-3">
          <button
            onClick={() => setShowSources(v => !v)}
            className="flex items-center gap-2 text-xs text-navy/50 hover:text-navy transition-colors"
          >
            <span>{showSources ? '▾' : '▸'}</span>
            <span>{showSources ? 'Hide' : 'Show'} sources ({sources.length})</span>
          </button>
          {showSources && (
            <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t border-gray-100">
              {sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <p className="text-xs text-navy/60">📄 {s.section}</p>
                  <span className="badge-blue text-[10px]">{s.relevance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={e => { e.preventDefault(); handleAsk(question) }}
        className="card flex gap-2 p-3"
      >
        <input
          className="input flex-1 rounded-full border-0 bg-app-bg focus:ring-0 focus:bg-white"
          placeholder="Ask anything about this document…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="btn-primary px-5 py-2 text-sm"
        >
          Ask
        </button>
      </form>
    </div>
  )
}
