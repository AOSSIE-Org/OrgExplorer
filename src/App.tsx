import './App.css'
import { Link, Route, Routes } from 'react-router-dom'

function App() {
  function HomeRoute() {

    return (
      <>
        <h1>Hello, OrgExplorer!</h1>
      </>
    )
  }



  function NotFoundRoute() {
    return (
      <>
        <h1>404</h1>
        <p>Page not found.</p>
        <Link to="/">Go home</Link>
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </>
  )
}

export default App
