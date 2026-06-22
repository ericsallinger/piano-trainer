import { useState } from 'react'
import { PROMPTS } from '../progression/prompts'

const COPIED_RESET_MS = 2000

export function PromptPanel() {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)

  function handleCopy(label: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedLabel(label)
    setTimeout(() => setCopiedLabel(null), COPIED_RESET_MS)
  }

  return (
    <section className="panel prompt-panel">
      <div className="prompt-list">
        {PROMPTS.map((p) => (
          <button key={p.label} onClick={() => handleCopy(p.label, p.text)}>
            {copiedLabel === p.label ? 'Copied!' : p.label}
          </button>
        ))}
      </div>
    </section>
  )
}
