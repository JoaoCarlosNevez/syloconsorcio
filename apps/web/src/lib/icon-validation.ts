// Validação client-side de ícone de organização — espelha
// apps/api/src/lib/icon-validation.ts (a validação real é sempre a do backend;
// isto só dá feedback rápido antes de gastar uma requisição).

export const MAX_ICON_SIZE_BYTES = 2 * 1024 * 1024

// 5% de tolerância — aceita, por ex., 512x500 mas rejeita 512x384 (4:3).
const ASPECT_RATIO_TOLERANCE = 0.05

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    img.src = url
  })
}

/** Retorna uma mensagem de erro se o arquivo não servir como ícone, ou null se for válido. */
export async function validateIconFile(file: File): Promise<string | null> {
  if (file.size > MAX_ICON_SIZE_BYTES) {
    return 'Imagem muito grande. Limite de 2MB.'
  }

  let width: number
  let height: number
  try {
    ;({ width, height } = await readImageDimensions(file))
  } catch {
    return 'Não foi possível ler as dimensões da imagem.'
  }

  if (!width || !height) {
    return 'Não foi possível ler as dimensões da imagem.'
  }

  const ratio = width / height
  if (Math.abs(ratio - 1) > ASPECT_RATIO_TOLERANCE) {
    return `A imagem precisa ser quadrada (proporção 1:1). Recebido: ${width}×${height}px.`
  }

  return null
}
