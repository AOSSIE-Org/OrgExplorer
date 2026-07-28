import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar          from './components/Navbar'
import RateLimitBanner from './components/RateLimitBanner'
import HomePage        from './pages/HomePage'
import OverviewPage    from './pages/OverviewPage'
import RepositoriesPage from './pages/RepositoriesPage'
import ContributorsPage from './pages/ContributorsPage'
import ContributorProfilePage from './pages/ContributorProfilePage'
import NetworkPage     from './pages/NetworkPage'
import AnalyticsPage   from './pages/AnalyticsPage'
import GovernancePage  from './pages/GovernancePage'
import SettingsPage    from './pages/SettingsPage'
import Footer from './components/layout/Footer'

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <RateLimitBanner />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  )
}

function AppContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/"             element={<HomePage />} />
        <Route path="/overview"     element={<OverviewPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/contributors" element={<ContributorsPage />} />
        <Route path="/contributors/:username" element={<ContributorProfilePage />} />
        <Route path="/network"      element={<NetworkPage />} />
        <Route path="/analytics"    element={<AnalyticsPage />} />
        <Route path="/governance"   element={<GovernancePage />} />
        <Route path="/settings"     element={<SettingsPage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  )
}
