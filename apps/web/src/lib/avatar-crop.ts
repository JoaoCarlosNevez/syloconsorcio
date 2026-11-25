// Contas do recorte quadrado da foto de perfil (AvatarCropDialog). A imagem é
// desenhada dentro de um quadro de `view` px: `scale` converte pixels da
// imagem em pixels da tela e (x, y) é onde fica o canto superior esquerdo da
// imagem no quadro. A imagem sempre cobre o quadro inteiro — sem faixa vazia.

export interface CropState {
  x: number
  y: number
  scale: number
}

export interface ImageSize {
  width: number
  height: number
}

/** Maior zoom além do "cobrir o quadro". */
export const MAX_ZOOM = 4

/** Escala mínima: o lado menor da imagem ocupa o quadro inteiro. */
export function coverScale(image: ImageSize, view: number): number {
  return view / Math.min(image.width, image.height)
}

/** Mantém a imagem cobrindo o quadro (sem buraco nas bordas). */
export function clampCrop(state: CropState, image: ImageSize, view: number): CropState {
  const min = coverScale(image, view)
  const scale = Math.min(Math.max(state.scale, min), min * MAX_ZOOM)
  const width = image.width * scale
  const height = image.height * scale
  return {
    scale,
    x: Math.min(0, Math.max(view - width, state.x)),
    y: Math.min(0, Math.max(view - height, state.y)),
  }
}

/** Começo: imagem cobrindo o quadro, centralizada. */
export function initialCrop(image: ImageSize, view: number): CropState {
  const scale = coverScale(image, view)
  return {
    scale,
    x: (view - image.width * scale) / 2,
    y: (view - image.height * scale) / 2,
  }
}

/** Troca a escala mantendo parado o ponto (focusX, focusY) do quadro. */
export function zoomCrop(
  state: CropState,
  nextScale: number,
  image: ImageSize,
  view: number,
  focusX = view / 2,
  focusY = view / 2,
): CropState {
  const ratio = nextScale / state.scale
  return clampCrop(
    {
      scale: nextScale,
      x: focusX - (focusX - state.x) * ratio,
      y: focusY - (focusY - state.y) * ratio,
    },
    image,
    view,
  )
}

/** Quadrado da imagem original que aparece no quadro — o que vai pro canvas. */
export function sourceSquare(
  state: CropState,
  view: number,
): { sx: number; sy: number; size: number } {
  return { sx: -state.x / state.scale, sy: -state.y / state.scale, size: view / state.scale }
}
