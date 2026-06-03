export default function Header() {
  return (
    <div className="border-b border-border-dim pb-6 mb-6">
      <h1 className="font-display text-3xl font-bold tracking-tight leading-none">
        FinDocIQ{' '}
        <span className="text-accent">Financial Document</span>{' '}
        Intelligence
      </h1>
      <p className="font-mono text-xs text-text-muted mt-2">
        Upload SEC filings · Extract metrics · Score risks · Analyse sentiment · Ask anything
      </p>
    </div>
  )
}
