// AvatarCropDialog — recorte quadrado da foto de perfil antes do envio, no
// web (Perfil → Editar perfil) e no celular (/m/perfil). Arrastar move a
// foto; o controle deslizante, a roda do mouse e o pinça (dois dedos) dão
// zoom. A saída é um JPEG de 512×512 — sempre quadrado e bem abaixo dos 2 MB
// que a API aceita. Contas em lib/avatar-crop.ts.

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  type CropState,
  type ImageSize,
  MAX_ZOOM,
  clampCrop,
  coverScale,
  initialCrop,
  sourceSquare,
  zoomCrop,
} from '../../lib/avatar-crop'
import styles from './AvatarCropDialog.module.css'

const OUTPUT_SIZE = 512
const OUTPUT_QUALITY = 0.9
/** Lado do quadro na tela — encolhe em telas estreitas. */
const MAX_VIEW = 320

/** Foto grande demais nem tenta abrir (o recorte reduz pra 512 px depois). */
export const MAX_AVATAR_SOURCE_BYTES = 20 * 1024 * 1024

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Erro pra mostrar antes de abrir o recorte, ou null se dá pra recortar. */
export function avatarSourceError(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) return 'Use uma foto JPG, PNG ou WEBP.'
  if (file.size > MAX_AVATAR_SOURCE_BYTES) return 'Foto muito grande. Limite de 20 MB.'
  return null
}

function viewSize(): number {
  return Math.min(MAX_VIEW, Math.floor(window.innerWidth - 64))
}

function renderSquare(image: HTMLImageElement, crop: CropState, view: number): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('Seu navegador não conseguiu recortar a foto.'))
  // Fundo branco: PNG com transparência não vira preto no JPEG.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  context.imageSmoothingQuality = 'high'
  const { sx, sy, size } = sourceSquare(crop, view)
  context.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível gerar a foto recortada.'))
          return
        }
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      OUTPUT_QUALITY,
    )
  })
}

export interface AvatarCropDialogProps {
  file: File
  onCancel: () => void
  /** Recebe a foto já quadrada; a tela que abriu faz o upload. */
  onConfirm: (cropped: File) => Promise<void> | void
  isSaving?: boolean
}

export function AvatarCropDialog({
  file,
  onCancel,
  onConfirm,
  isSaving = false,
}: AvatarCropDialogProps) {
  const [view] = useState(viewSize)
  const [url, setUrl] = useState<string | null>(null)
  const [size, setSize] = useState<ImageSize | null>(null)
  const [crop, setCrop] = useState<CropState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef<number | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function onLoad() {
    const image = imageRef.current
    if (!image?.naturalWidth || !image.naturalHeight) {
      setError('Não foi possível ler a imagem.')
      return
    }
    const next = { width: image.naturalWidth, height: image.naturalHeight }
    setSize(next)
    setCrop(initialCrop(next, view))
  }

  function pointInView(event: ReactPointerEvent | ReactWheelEvent) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pinchDistance.current = null
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous || !crop || !size) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const active = [...pointers.current.values()]

    if (active.length >= 2) {
      const [a, b] = active as [{ x: number; y: number }, { x: number; y: number }]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDistance.current) {
        const rect = event.currentTarget.getBoundingClientRect()
        const focusX = (a.x + b.x) / 2 - rect.left
        const focusY = (a.y + b.y) / 2 - rect.top
        const nextScale = crop.scale * (distance / pinchDistance.current)
        setCrop(zoomCrop(crop, nextScale, size, view, focusX, focusY))
      }
      pinchDistance.current = distance
      return
    }

    setCrop(
      clampCrop(
        {
          ...crop,
          x: crop.x + event.clientX - previous.x,
          y: crop.y + event.clientY - previous.y,
        },
        size,
        view,
      ),
    )
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    pinchDistance.current = null
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!crop || !size) return
    const focus = pointInView(event)
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
    setCrop(zoomCrop(crop, crop.scale * factor, size, view, focus.x, focus.y))
  }

  async function confirm() {
    const image = imageRef.current
    if (!image || !crop) return
    setError(null)
    setRendering(true)
    try {
      const cropped = await renderSquare(image, crop, view)
      await onConfirm(cropped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a foto.')
    } finally {
      setRendering(false)
    }
  }

  const minScale = size ? coverScale(size, view) : 1
  const zoom = crop ? crop.scale / minScale : 1
  const busy = rendering || isSaving

  return createPortal(
    <div className={styles.overlay}>
      <dialog open className={styles.dialog} aria-modal="true" aria-labelledby="avatar-crop-title">
        <h2 id="avatar-crop-title" className={styles.title}>
          Ajustar foto
        </h2>
        <p className={styles.hint}>Arraste pra posicionar e use o zoom pra enquadrar o rosto.</p>

        <div
          className={styles.frame}
          style={{ width: view, height: view }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {url && (
            <img
              ref={imageRef}
              src={url}
              alt=""
              draggable={false}
              onLoad={onLoad}
              onError={() => setError('Não foi possível ler a imagem.')}
              className={styles.image}
              style={
                crop && size
                  ? {
                      width: size.width * crop.scale,
                      height: size.height * crop.scale,
                      transform: `translate(${crop.x}px, ${crop.y}px)`,
                    }
                  : { opacity: 0 }
              }
            />
          )}
          <div className={styles.mask} aria-hidden="true" />
        </div>

        <label className={styles.zoom}>
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!crop}
            onChange={(event) =>
              crop &&
              size &&
              setCrop(zoomCrop(crop, minScale * Number(event.target.value), size, view))
            }
          />
        </label>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={confirm}
            disabled={!crop || busy}
          >
            {busy ? 'Salvando…' : 'Usar foto'}
          </button>
        </div>
      </dialog>
    </div>,
    document.body,
  )
}
