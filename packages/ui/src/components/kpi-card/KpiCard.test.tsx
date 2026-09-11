import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiCard } from './KpiCard'

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Total vendas" value="R$ 12.000" />)
    expect(screen.getByText('Total vendas')).toBeInTheDocument()
    expect(screen.getByText('R$ 12.000')).toBeInTheDocument()
  })

  it('renders delta', () => {
    render(
      <KpiCard label="KPI" value="100" delta="+12% vs mês anterior" deltaDirection="positive" />,
    )
    expect(screen.getByText('+12% vs mês anterior')).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<KpiCard label="KPI" value="100" footer="Atualizado hoje" />)
    expect(screen.getByText('Atualizado hoje')).toBeInTheDocument()
  })

  it('renders icon slot', () => {
    render(<KpiCard label="KPI" value="100" icon={<span data-testid="icon" />} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
