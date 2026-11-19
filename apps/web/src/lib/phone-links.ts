// Links de ligação/WhatsApp a partir do telefone do cliente (padrão BR).

/** Só os dígitos, com DDI 55 quando o número veio sem (padrão BR). */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

/** Tem número suficiente pra abrir ligação/WhatsApp (DDD + número). */
export function hasPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 10
}

export function telLink(phone: string): string {
  return `tel:+${phoneDigits(phone)}`
}

export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/${phoneDigits(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
