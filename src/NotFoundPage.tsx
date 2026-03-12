import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/">Go home</Link>
    </>
  )
}

