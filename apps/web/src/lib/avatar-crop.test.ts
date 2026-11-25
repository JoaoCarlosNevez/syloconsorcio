import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, clampCrop, coverScale, initialCrop, sourceSquare, zoomCrop } from './avatar-crop'

const WIDE = { width: 1920, height: 1080 } // 16:9
const VIEW = 300

describe('initialCrop', () => {
  it('covers the square with the short side and centers a 16:9 photo', () => {
    const crop = initialCrop(WIDE, VIEW)
    expect(crop.scale).toBeCloseTo(VIEW / 1080)
    expect(crop.y).toBe(0)
    expect(crop.x).toBeCloseTo((VIEW - 1920 * crop.scale) / 2)
    const square = sourceSquare(crop, VIEW)
    expect(square.size).toBeCloseTo(1080)
    expect(square.sx).toBeCloseTo(420)
    expect(square.sy).toBeCloseTo(0)
  })
})

describe('clampCrop', () => {
  it('never leaves an empty strip and keeps the zoom between cover and the max', () => {
    const min = coverScale(WIDE, VIEW)
    expect(clampCrop({ x: 50, y: 20, scale: min }, WIDE, VIEW)).toEqual({ x: 0, y: 0, scale: min })
    const far = clampCrop({ x: -5000, y: 0, scale: min }, WIDE, VIEW)
    expect(far.x).toBeCloseTo(VIEW - 1920 * min)
    expect(clampCrop({ x: 0, y: 0, scale: min / 2 }, WIDE, VIEW).scale).toBe(min)
    expect(clampCrop({ x: 0, y: 0, scale: min * 99 }, WIDE, VIEW).scale).toBe(min * MAX_ZOOM)
  })
})

describe('zoomCrop', () => {
  it('keeps the center of the square in place when zooming', () => {
    const start = initialCrop(WIDE, VIEW)
    const before = sourceSquare(start, VIEW)
    const zoomed = zoomCrop(start, start.scale * 2, WIDE, VIEW)
    const after = sourceSquare(zoomed, VIEW)
    expect(after.size).toBeCloseTo(before.size / 2)
    expect(after.sx + after.size / 2).toBeCloseTo(before.sx + before.size / 2)
    expect(after.sy + after.size / 2).toBeCloseTo(before.sy + before.size / 2)
  })
})
