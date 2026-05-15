import { useState } from 'react'

interface SearchBarProps {
  onSearch: (orgName: string) => void
}

function SearchBar({ onSearch }: SearchBarProps) {
  const [input, setInput] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!input.trim()) {
      return
    }

    onSearch(input)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter GitHub organization"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />

      <button type="submit">Search</button>
    </form>
  )
}

export default SearchBar