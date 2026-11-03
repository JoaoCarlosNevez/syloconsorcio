// CEP → endereço pela ViaCEP (pública, sem chave). Usado na ficha de adesão
// do web e do celular.

/** "Rua X — Bairro, Cidade/UF", ou null se o CEP não existir. */
export async function lookupZipCode(zipCode: string): Promise<string | null> {
  const digits = zipCode.replace(/\D/g, '')
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!response.ok) return null
  const data = (await response.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }
  if (data.erro) return null
  const street = [data.logradouro, data.bairro].filter(Boolean).join(' — ')
  return `${street ? `${street}, ` : ''}${data.localidade ?? ''}/${data.uf ?? ''}`
}
