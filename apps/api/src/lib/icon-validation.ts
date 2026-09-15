// Validação de ícone de organização — usada tanto pelo upload do Super Admin
// (organizations.route.ts) quanto pelo upload do próprio ADMIN, condicionado a
// White Label (organization-settings.route.ts).
//
// Regras de negócio do ícone:
//   - Formatos aceitos: PNG, JPEG, WEBP, SVG
//   - Tamanho máximo: 2MB
//   - Proporção: quadrada (1:1), com tolerância pequena pra logos "quase
//     quadrados" não travarem por 1-2px de diferença de exportação

import { imageSize } from 'image-size'

export const MAX_ICON_SIZE_BYTES = 2 * 1024 * 1024

export const ICON_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

// 5% de tolerância — aceita, por ex., 512x500 mas rejeita 512x384 (4:3).
const ASPECT_RATIO_TOLERANCE = 0.05

export type IconValidationErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'INVALID_DIMENSIONS'
  | 'NOT_SQUARE'

export interface IconValidationError {
  code: IconValidationErrorCode
  message: string
}

/**
 * Valida um upload de ícone de organização. Retorna null quando válido,
 * ou o primeiro erro encontrado (formato → tamanho → dimensões → proporção).
 */
export function validateIconUpload(buffer: Buffer, mimetype: string): IconValidationError | null {
  const extension = ICON_EXTENSION_BY_MIME[mimetype]
  if (!extension) {
    return {
      code: 'UNSUPPORTED_FORMAT',
      message: 'Formato de imagem não suportado. Use PNG, JPEG, WEBP ou SVG.',
    }
  }

  if (buffer.byteLength > MAX_ICON_SIZE_BYTES) {
    return { code: 'FILE_TOO_LARGE', message: 'Imagem muito grande. Limite de 2MB.' }
  }

  let width: number | undefined
  let height: number | undefined
  try {
    const size = imageSize(buffer)
    width = size.width
    height = size.height
  } catch {
    // Cai no bloco abaixo (width/height undefined) — mesma mensagem de erro.
  }

  if (!width || !height) {
    return {
      code: 'INVALID_DIMENSIONS',
      message: 'Não foi possível ler as dimensões da imagem.',
    }
  }

  const ratio = width / height
  if (Math.abs(ratio - 1) > ASPECT_RATIO_TOLERANCE) {
    return {
      code: 'NOT_SQUARE',
      message: `A imagem precisa ser quadrada (proporção 1:1). Recebido: ${width}×${height}px.`,
    }
  }

  return null
}
