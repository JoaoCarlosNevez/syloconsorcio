// Compressão de imagem de upload (avatar de usuário, ícone de organização) —
// roda depois de validateIconUpload, antes de storageProvider.uploadPublicFile.
//
// Reduz o espaço ocupado no Storage: essas imagens só aparecem em miniatura na
// UI (avatar, ícone de marca), então não há motivo pra guardar a resolução
// original. Redimensiona pro tamanho máximo de exibição e reencoda em WebP,
// que comprime melhor que PNG/JPEG na mesma qualidade percebida.
//
// SVG é vetorial — não faz sentido rasterizar, passa direto sem alteração.

import sharp from 'sharp'

const MAX_DIMENSION_PX = 512
const WEBP_QUALITY = 80

export interface ProcessedImage {
  buffer: Buffer
  contentType: string
  extension: string
}

export async function compressImage(buffer: Buffer, mimetype: string): Promise<ProcessedImage> {
  if (mimetype === 'image/svg+xml') {
    return { buffer, contentType: mimetype, extension: 'svg' }
  }

  const compressed = await sharp(buffer)
    .resize(MAX_DIMENSION_PX, MAX_DIMENSION_PX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  return { buffer: compressed, contentType: 'image/webp', extension: 'webp' }
}
