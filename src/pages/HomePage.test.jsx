import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

const mockExplore = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    explore: mockExplore,
    loading: false,
    loadMsg: '',
    error: null,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('HomePage search chips interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('restores the last chip into input when Backspace is pressed on empty input and focuses input', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)

    // Add first chip
    await userEvent.type(input, 'org-one{enter}')
    expect(screen.getByRole('button', { name: 'Edit org-one' })).toBeInTheDocument()
    expect(input).toHaveValue('')

    // Add second chip
    await userEvent.type(input, 'org-two{enter}')
    const chips = screen.getAllByTitle('Click to edit')
    expect(chips).toHaveLength(2)
    expect(input).toHaveValue('')

    // Press Backspace on empty input
    fireEvent.keyDown(input, { key: 'Backspace' })

    // Second chip should be removed and loaded back into input for editing
    expect(screen.getAllByTitle('Click to edit')).toHaveLength(1)
    expect(input).toHaveValue('org-two')
    expect(input).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Edit org-one' })).toBeInTheDocument()
  })

  it('allows editing a chip by clicking on it and focuses the input', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)

    // Add a chip with a typo
    await userEvent.type(input, 'org-typo{enter}')
    const chip = screen.getByRole('button', { name: 'Edit org-typo' })
    expect(chip).toBeInTheDocument()
    expect(input).toHaveValue('')

    // Click on the chip to edit it
    await userEvent.click(chip)

    // Chip should be removed, value placed into input, and input focused
    expect(screen.queryByRole('button', { name: 'Edit org-typo' })).not.toBeInTheDocument()
    expect(input).toHaveValue('org-typo')
    expect(input).toHaveFocus()
  })

  it('allows keyboard navigation (Tab + Enter/Space) to edit an earlier chip', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)

    // Add two chips
    await userEvent.type(input, 'org-first{enter}')
    await userEvent.type(input, 'org-second{enter}')

    const firstChipBtn = screen.getByRole('button', { name: 'Edit org-first' })
    firstChipBtn.focus()
    expect(firstChipBtn).toHaveFocus()

    // Press Enter to edit the first chip
    await userEvent.keyboard('{Enter}')

    // First chip is loaded into input, second chip remains intact
    expect(input).toHaveValue('org-first')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Edit org-first' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit org-second' })).toBeInTheDocument()
  })

  it('still removes a chip when the X icon is clicked without filling input', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)
    await userEvent.type(input, 'org-to-delete{enter}')
    expect(screen.getByRole('button', { name: 'Edit org-to-delete' })).toBeInTheDocument()

    // Find remove button by accessible name
    const removeBtn = screen.getByRole('button', { name: 'Remove org-to-delete' })
    await userEvent.click(removeBtn)

    expect(screen.queryByRole('button', { name: 'Edit org-to-delete' })).not.toBeInTheDocument()
    expect(input).toHaveValue('')
  })
})
