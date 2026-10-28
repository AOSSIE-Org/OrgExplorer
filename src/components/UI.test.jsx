import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortTh } from './UI'

function headers(sortConfig, onSort) {
  return (
    <table>
      <thead>
        <tr>
          <SortTh label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
          <SortTh label="Stars" sortKey="stars" sortConfig={sortConfig} onSort={onSort} />
        </tr>
      </thead>
    </table>
  )
}

function renderHeaders(sortConfig, onSort = vi.fn()) {
  render(headers(sortConfig, onSort))
  return onSort
}

describe('SortTh', () => {
  it('renders the header label as a button', () => {
    renderHeaders({ key: 'stars', dir: 'desc' })

    expect(screen.getByRole('button', { name: 'Name' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Stars' })).toBeInTheDocument()
  })

  it('calls onSort with the column key when clicked', async () => {
    const onSort = renderHeaders({ key: 'stars', dir: 'desc' })

    await userEvent.click(screen.getByRole('button', { name: 'Name' }))

    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort).toHaveBeenCalledWith('name')
  })

  it('can be focused with Tab and triggered with Enter and Space', async () => {
    const user = userEvent.setup()
    const onSort = renderHeaders({ key: 'stars', dir: 'desc' })

    await user.tab()
    expect(screen.getByRole('button', { name: 'Name' })).toHaveFocus()
    await user.keyboard('{Enter}')

    await user.tab()
    expect(screen.getByRole('button', { name: 'Stars' })).toHaveFocus()
    await user.keyboard(' ')

    expect(onSort.mock.calls).toEqual([['name'], ['stars']])
  })

  it('sets aria-sort from sortConfig', () => {
    const onSort = vi.fn()
    const { rerender } = render(headers({ key: 'stars', dir: 'desc' }, onSort))

    const [name, stars] = screen.getAllByRole('columnheader')
    expect(name).toHaveAttribute('aria-sort', 'none')
    expect(stars).toHaveAttribute('aria-sort', 'descending')

    rerender(headers({ key: 'name', dir: 'asc' }, onSort))

    expect(name).toHaveAttribute('aria-sort', 'ascending')
    expect(stars).toHaveAttribute('aria-sort', 'none')
  })

  it('hides the sort icon from assistive technology', () => {
    renderHeaders({ key: 'name', dir: 'asc' })

    const svg = screen.getByRole('button', { name: 'Name' }).querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})