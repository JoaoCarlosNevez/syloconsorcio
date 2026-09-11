import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from './DataTable'
import { DataTable } from './DataTable'

interface Row {
  id: string
  name: string
  age: number
}

const COLUMNS: ColumnDef<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name, sortable: true },
  { key: 'age', header: 'Age', render: (r) => r.age },
]

const DATA: Row[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={COLUMNS} data={DATA} rowKey={(r) => r.id} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable columns={COLUMNS} data={DATA} rowKey={(r) => r.id} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows empty state when data is empty', () => {
    render(<DataTable columns={COLUMNS} data={[]} rowKey={(r) => r.id} emptyTitle="No data" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(<DataTable columns={COLUMNS} data={[]} rowKey={(r) => r.id} error="Network error" />)
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('renders skeleton rows when loading', () => {
    render(
      <DataTable columns={COLUMNS} data={[]} rowKey={(r) => r.id} isLoading skeletonRows={3} />,
    )
    // Table should have aria-busy
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('calls onSort when sortable header is clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <DataTable
        columns={COLUMNS}
        data={DATA}
        rowKey={(r) => r.id}
        onSort={onSort}
        sortKey="name"
        sortDirection="asc"
      />,
    )
    await user.click(screen.getByText('Name'))
    expect(onSort).toHaveBeenCalledWith('name')
  })
})
