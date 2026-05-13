import { Routes, Route } from 'react-router-dom'

function Home() {
  return (
    <h1>Hello, OrgExplorer!</h1>
  )
}

function NotFoundPage() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <a href="/">Go Back Home</a>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App