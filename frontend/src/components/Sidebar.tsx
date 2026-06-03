import type { UploadedDocument } from '../types'

const SAMPLE_QUESTIONS = [
  'What were the main revenue drivers?',
  'What are the top 3 risk factors?',
  'How did gross margin change YoY?',
  "What is management's outlook for next quarter?",
  'Summarise the key financial highlights.',
]

interface Props {
  documents: Record<string, UploadedDocument>
  activeDocId: string | null
  onSelectDoc: (id: string) => void
  onSampleQuestion: (q: string) => void
}

export default function Sidebar({ documents, activeDocId, onSelectDoc, onSampleQuestion }: Props) {
  const docList = Object.values(documents)

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-6 border-r border-border-dim pr-6">
      <section>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
          Documents
        </p>
        {docList.length === 0 ? (
          <p className="text-xs text-text-muted">No documents uploaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {docList.map((doc) => {
              const label = `${doc.company_name ?? doc.filename} (${doc.period ?? doc.doc_type})`
              const isActive = doc.document_id === activeDocId
              return (
                <li key={doc.document_id}>
                  <button
                    onClick={() => onSelectDoc(doc.document_id)}
                    className={`w-full text-left text-xs px-3 py-2 border transition-colors truncate ${
                      isActive
                        ? 'border-accent text-accent bg-bg-tertiary'
                        : 'border-border-dim text-text-muted hover:text-text-primary hover:border-text-muted'
                    }`}
                    title={label}
                  >
                    {label}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
          Sample Questions
        </p>
        <ul className="flex flex-col gap-1">
          {SAMPLE_QUESTIONS.map((q) => (
            <li key={q}>
              <button
                onClick={() => onSampleQuestion(q)}
                className="w-full text-left text-xs text-text-muted hover:text-accent transition-colors py-1"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto pt-4 border-t border-border-dim">
        <p className="text-xs text-text-muted">
          Built by{' '}
          <a
            href="https://joycee.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Joycee Catamora Paragas
          </a>
        </p>
      </div>
    </aside>
  )
}
