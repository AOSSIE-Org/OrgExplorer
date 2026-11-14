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

  it('restores the last chip into input when Backspace is pressed on empty input', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)

    // Add first chip
    await userEvent.type(input, 'org-one{enter}')
    expect(screen.getByTitle('Click to edit')).toHaveTextContent('org-one')
    expect(input).toHaveValue('')

    // Add second chip
    await userEvent.type(input, 'org-two{enter}')
    const chips = screen.getAllByTitle('Click to edit')
    expect(chips).toHaveLength(2)
    expect(chips[1]).toHaveTextContent('org-two')
    expect(input).toHaveValue('')

    // Press Backspace on empty input
    fireEvent.keyDown(input, { key: 'Backspace' })

    // Second chip should be removed and loaded back into input for editing
    expect(screen.getAllByTitle('Click to edit')).toHaveLength(1)
    expect(input).toHaveValue('org-two')
    expect(screen.getByTitle('Click to edit')).toHaveTextContent('org-one')
  })

  it('allows editing a chip by clicking on it', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)

    // Add a chip with a typo
    await userEvent.type(input, 'org-typo{enter}')
    const chip = screen.getByTitle('Click to edit')
    expect(chip).toHaveTextContent('org-typo')
    expect(input).toHaveValue('')

    // Click on the chip to edit it
    await userEvent.click(chip)

    // Chip should be removed and its value placed into input
    expect(screen.queryByTitle('Click to edit')).not.toBeInTheDocument()
    expect(input).toHaveValue('org-typo')
  })

  it('still removes a chip when the X icon is clicked without filling input', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/AOSSIE-Org/i)
    await userEvent.type(input, 'org-to-delete{enter}')
    expect(screen.getByTitle('Click to edit')).toHaveTextContent('org-to-delete')

    // Find remove button by title "Remove"
    const removeBtn = screen.getByTitle('Remove')
    await userEvent.click(removeBtn)

    expect(screen.queryByTitle('Click to edit')).not.toBeInTheDocument()
    expect(input).toHaveValue('')
  })
})
