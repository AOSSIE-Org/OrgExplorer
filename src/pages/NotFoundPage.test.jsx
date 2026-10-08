import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'

function renderAt(entries, initialIndex = entries.length - 1) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/" element={<div>home page</div>} />
        <Route path="/overview" element={<div>overview page</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('NotFoundPage', () => {
  it('renders for unknown routes instead of redirecting home', () => {
    renderAt(['/does-not-exist'])

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.queryByText('home page')).not.toBeInTheDocument()
  })

  it('shows a helpful message', () => {
    renderAt(['/nope'])

    expect(screen.getByText(/looking for/i)).toBeInTheDocument()
  })

  it('navigates home when "Go to Home" is clicked', async () => {
    renderAt(['/nope'])

    await userEvent.click(screen.getByRole('button', { name: /go to home/i }))

    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('hides "Go back" when the unknown route is opened directly', () => {
    renderAt(['/nope'])

    expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument()
  })

  it('shows "Go back" and returns to the previous in-app page', async () => {
    renderAt(['/overview', '/nope'])

    await userEvent.click(screen.getByRole('button', { name: /go back/i }))

    expect(screen.getByText('overview page')).toBeInTheDocument()
  })
})
