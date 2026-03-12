import './App.css'
import { Route, Routes } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'

function HomeRoute() {

  return (
    <>
      <h1>Hello, OrgExplorer!</h1>
    </>
  )
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
