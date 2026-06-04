import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import UploadTab from './components/tabs/UploadTab'
import QATab from './components/tabs/QATab'
import MetricsTab from './components/tabs/MetricsTab'
import RisksTab from './components/tabs/RisksTab'
import SentimentTab from './components/tabs/SentimentTab'
import CompareTab from './components/tabs/CompareTab'
import type { ChatMessage, UploadedDocument } from './types'

type Tab = 'upload' | 'qa' | 'metrics' | 'risks' | 'sentiment' | 'compare'

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: 'upload',    label: '📤 Upload' },
  { id: 'qa',       label: '💬 Q&A' },
  { id: 'metrics',  label: '📊 Metrics' },
  { id: 'risks',    label: '⚠ Risks' },
  { id: 'sentiment', label: '📈 Sentiment' },
]

export default function App() {
  const [documents, setDocuments] = useState<Record<string, UploadedDocument>>({})
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [prefillQuestion, setPrefillQuestion] = useState('')

  const docCount = Object.keys(documents).length
  const tabs = docCount >= 2
    ? [...BASE_TABS, { id: 'compare' as Tab, label: '🔄 Compare' }]
    : BASE_TABS

  const activeDoc = activeDocId ? documents[activeDocId] : null

  function handleUpload(doc: UploadedDocument) {
    setDocuments((prev) => ({ ...prev, [doc.document_id]: doc }))
    setActiveDocId(doc.document_id)
    setChatHistory([])
    setActiveTab('qa')
  }

  function handleSelectDoc(id: string) {
    setActiveDocId(id)
    setChatHistory([])
  }

  function handleSampleQuestion(q: string) {
    setPrefillQuestion(q)
    setActiveTab('qa')
  }

  function handleChatMessage(user: string, assistant: string) {
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: user },
      { role: 'assistant', content: assistant },
    ])
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 py-8 gap-6">
        <Header />

        <div className="flex gap-8 flex-1 min-h-0">
          <Sidebar
            documents={documents}
            activeDocId={activeDocId}
            onSelectDoc={handleSelectDoc}
            onSampleQuestion={handleSampleQuestion}
          />

          <main className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Tab nav */}
            <nav className="flex gap-6 border-b border-border-dim">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-mono transition-colors ${
                    activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'upload' && <UploadTab onUpload={handleUpload} />}

              {activeTab === 'qa' && !activeDoc && (
                <p className="text-sm text-text-muted">Upload and select a document first.</p>
              )}
              {activeTab === 'qa' && activeDoc && (
                <QATab
                  document={activeDoc}
                  chatHistory={chatHistory}
                  onMessage={handleChatMessage}
                  prefillQuestion={prefillQuestion}
                  onClearPrefill={() => setPrefillQuestion('')}
                />
              )}

              {activeTab === 'metrics' && !activeDoc && (
                <p className="text-sm text-text-muted">Upload and select a document first.</p>
              )}
              {activeTab === 'metrics' && activeDoc && <MetricsTab document={activeDoc} />}

              {activeTab === 'risks' && !activeDoc && (
                <p className="text-sm text-text-muted">Upload and select a document first.</p>
              )}
              {activeTab === 'risks' && activeDoc && <RisksTab document={activeDoc} />}

              {activeTab === 'sentiment' && !activeDoc && (
                <p className="text-sm text-text-muted">Upload and select a document first.</p>
              )}
              {activeTab === 'sentiment' && activeDoc && <SentimentTab document={activeDoc} />}

              {activeTab === 'compare' && <CompareTab documents={documents} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
