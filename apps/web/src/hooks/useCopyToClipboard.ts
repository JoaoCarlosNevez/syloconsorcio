// useCopyToClipboard — copia texto e lembra por alguns segundos o que foi
// copiado (pra trocar o rótulo do botão por "Copiado!"), ou que falhou — o
// navegador pode negar acesso à área de transferência.

import { useEffect, useState } from 'react'

const FEEDBACK_MS = 2000

export function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!copiedKey && !failedKey) return
    const timer = setTimeout(() => {
      setCopiedKey(null)
      setFailedKey(null)
    }, FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [copiedKey, failedKey])

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setFailedKey(null)
      setCopiedKey(key)
    } catch {
      // Sem permissão (ou contexto inseguro): avisa no botão; o texto segue
      // visível na tela pra copiar à mão.
      setCopiedKey(null)
      setFailedKey(key)
    }
  }

  return { copiedKey, failedKey, copy }
}
