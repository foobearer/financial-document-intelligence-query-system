import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import TopBar  from './components/TopBar'
import HomeTab      from './components/tabs/HomeTab'
import UploadTab    from './components/tabs/UploadTab'
import QATab        from './components/tabs/QATab'
import MetricsTab   from './components/tabs/MetricsTab'
import RisksTab     from './components/tabs/RisksTab'
import SentimentTab from './components/tabs/SentimentTab'
import CompareTab   from './components/tabs/CompareTab'
import type { ChatMessage, UploadedDocument } from './types'

export type Tab = 'home' | 'upload' | 'qa' | 'metrics' | 'risks' | 'sentiment' | 'compare'

const SESSION_DOCS_KEY    = 'findociq:documents'
const SESSION_DOCID_KEY   = 'findociq:activeDocId'

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [documents,       setDocuments]       = useState<Record<string, UploadedDocument>>(
    () => readSession(SESSION_DOCS_KEY, {}),
  )
  const [activeDocId,     setActiveDocId]     = useState<string | null>(
    () => readSession(SESSION_DOCID_KEY, null),
  )
  const [activeTab,       setActiveTab]       = useState<Tab>('home')
  const [chatHistory,     setChatHistory]     = useState<ChatMessage[]>([])
  const [prefillQuestion, setPrefillQuestion] = useState('')

  // Keep sessionStorage in sync — survives refresh, cleared on tab close
  useEffect(() => {
    sessionStorage.setItem(SESSION_DOCS_KEY, JSON.stringify(documents))
  }, [documents])

  useEffect(() => {
    if (activeDocId) sessionStorage.setItem(SESSION_DOCID_KEY, activeDocId)
    else             sessionStorage.removeItem(SESSION_DOCID_KEY)
  }, [activeDocId])

  const docList  = Object.values(documents)
  const activeDoc = activeDocId ? documents[activeDocId] : null

  function handleUpload(doc: UploadedDocument) {
    setDocuments(prev => ({ ...prev, [doc.document_id]: doc }))
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
    setChatHistory(prev => [
      ...prev,
      { role: 'user',      content: user },
      { role: 'assistant', content: assistant },
    ])
  }

  const needsDoc = ['qa', 'metrics', 'risks', 'sentiment'].includes(activeTab) && !activeDoc

  return (
    <div className="h-screen flex overflow-hidden bg-app-bg">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onSampleQuestion={handleSampleQuestion}
      />

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <TopBar
          activeTab={activeTab}
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={handleSelectDoc}
        />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">

          {/* Guard: tab requires a doc but none selected */}
          {needsDoc && (
            <div className="card max-w-sm mx-auto mt-20 text-center p-8">
              <div className="text-4xl mb-3">📂</div>
              <p className="font-bold text-navy mb-1">No document selected</p>
              <p className="text-sm text-navy/50 mb-5">Upload a document first to use this feature.</p>
              <button className="btn-primary w-full" onClick={() => setActiveTab('upload')}>
                Upload Document
              </button>
            </div>
          )}

          {!needsDoc && activeTab === 'home' && (
            <HomeTab
              documents={documents}
              onGoUpload={() => setActiveTab('upload')}
              onGoQA={() => setActiveTab('qa')}
            />
          )}

          {!needsDoc && activeTab === 'upload' && (
            <UploadTab onUpload={handleUpload} />
          )}

          {!needsDoc && activeTab === 'qa' && activeDoc && (
            <QATab
              document={activeDoc}
              chatHistory={chatHistory}
              onMessage={handleChatMessage}
              prefillQuestion={prefillQuestion}
              onClearPrefill={() => setPrefillQuestion('')}
            />
          )}

          {!needsDoc && activeTab === 'metrics' && activeDoc && (
            <MetricsTab document={activeDoc} />
          )}

          {!needsDoc && activeTab === 'risks' && activeDoc && (
            <RisksTab document={activeDoc} />
          )}

          {!needsDoc && activeTab === 'sentiment' && activeDoc && (
            <SentimentTab document={activeDoc} />
          )}

          {activeTab === 'compare' && (
            docList.length < 2
              ? (
                <div className="card max-w-sm mx-auto mt-20 text-center p-8">
                  <div className="text-4xl mb-3">🔄</div>
                  <p className="font-bold text-navy mb-1">Upload two documents to compare</p>
                  <p className="text-sm text-navy/50 mb-5">Side-by-side analysis of any two financial filings.</p>
                  <button className="btn-primary w-full" onClick={() => setActiveTab('upload')}>
                    Upload Documents
                  </button>
                </div>
              )
              : <CompareTab documents={documents} />
          )}

        </main>
      </div>
    </div>
  )
}
