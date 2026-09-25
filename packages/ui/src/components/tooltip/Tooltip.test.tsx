import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content="Hint">
        <button type="button">Hover me</button>
      </Tooltip>,
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('renders tooltip content in DOM (initially hidden via CSS)', () => {
    render(
      <Tooltip content="My hint">
        <button type="button">Button</button>
      </Tooltip>,
    )
    expect(screen.getByRole('tooltip', { hidden: true })).toBeInTheDocument()
  })

  it('shows tooltip on mouse enter', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <Tooltip content="Tip text" delay={0}>
        <button type="button">Btn</button>
      </Tooltip>,
    )
    // biome-ignore lint/style/noNonNullAssertion: Tooltip always wraps children in a span
    await user.hover(screen.getByText('Btn').closest('span')!)
    // Mesmo com delay={0} o show passa por um setTimeout — findByRole espera o
    // tooltip ficar acessível em vez de checar no mesmo tick do hover.
    expect(await screen.findByRole('tooltip')).toBeVisible()
  })
})
