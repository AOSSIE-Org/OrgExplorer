import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    explore: vi.fn(),
    loading: false,
    loadMsg: '',
    error: '',
  }),
}))

describe('HomePage recent searches', () => {
  it.each(['{invalid json', JSON.stringify({ search: 'test-org' })])(
    'renders safely when recent-search storage contains %s',
    stored => {
      localStorage.setItem('oe_recent', stored)
      render(<MemoryRouter><HomePage /></MemoryRouter>)
      expect(screen.queryByText('Recent searches')).not.toBeInTheDocument()
    }
  )

  it('displays valid recent searches in stored order', () => {
    localStorage.setItem('oe_recent', JSON.stringify(['first-org', 'second-org']))
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(within(screen.getByText('Recent searches').parentElement).getAllByRole('button')
      .map(button => button.textContent)).toEqual(['first-org', 'second-org'])
  })
})
