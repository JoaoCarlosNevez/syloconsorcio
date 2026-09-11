import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton, SkeletonCard, SkeletonTableRow, SkeletonText } from './Skeleton'

describe('Skeleton', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('applies variant class', () => {
    const { container } = render(<Skeleton variant="circle" />)
    // CSS Modules hash class names — check className string contains the variant name
    expect((container.firstChild as HTMLElement).className).toContain('circle')
  })

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="50px" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('200px')
    expect(el.style.height).toBe('50px')
  })
})

describe('SkeletonText', () => {
  it('renders the specified number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />)
    // Each line is aria-hidden
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(5)
  })
})

describe('SkeletonCard', () => {
  it('renders a rect skeleton', () => {
    const { container } = render(<SkeletonCard />)
    // CSS Modules hash class names — check className string contains 'rect'
    expect((container.firstChild as HTMLElement).className).toContain('rect')
  })
})

describe('SkeletonTableRow', () => {
  it('renders correct number of columns', () => {
    const { container } = render(<SkeletonTableRow columns={3} />)
    // The wrapper is aria-hidden; count its child elements (the Skeleton spans)
    const wrapper = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(wrapper.childElementCount).toBe(3)
  })
})
