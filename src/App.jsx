import React, { Suspense, Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar          from './components/Navbar'
import RateLimitBanner from './components/RateLimitBanner'
import Footer          from './components/layout/Footer'
import RequireAnalysis from './components/RequireAnalysis'
import { Spinner }     from './components/UI'

const HomePage               = React.lazy(() => import('./pages/HomePage'))
const OverviewPage           = React.lazy(() => import('./pages/OverviewPage'))
const RepositoriesPage        = React.lazy(() => import('./pages/RepositoriesPage'))
const ContributorsPage       = React.lazy(() => import('./pages/ContributorsPage'))
const ContributorProfilePage = React.lazy(() => import('./pages/ContributorProfilePage'))
const NetworkPage            = React.lazy(() => import('./pages/NetworkPage'))
const AnalyticsPage          = React.lazy(() => import('./pages/AnalyticsPage'))
const GovernancePage         = React.lazy(() => import('./pages/GovernancePage'))
const SettingsPage           = React.lazy(() => import('./pages/SettingsPage'))
const Support                = React.lazy(() => import('./pages/Support'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route load error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px', textAlign: 'center' }}>
          <h3>Unable to load page</h3>
          <p style={{ color: 'var(--text2)', marginBottom: '16px' }}>A network error occurred while loading this section.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }} role="status" aria-label="Loading page">
      <Spinner size={36} />
    </div>
  )
}

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
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<HomePage />} />
            <Route path="/overview"     element={<RequireAnalysis><OverviewPage /></RequireAnalysis>} />
            <Route path="/repositories" element={<RequireAnalysis><RepositoriesPage /></RequireAnalysis>} />
            <Route path="/contributors" element={<RequireAnalysis><ContributorsPage /></RequireAnalysis>} />
            <Route path="/contributors/:username" element={<RequireAnalysis><ContributorProfilePage /></RequireAnalysis>} />
            <Route path="/network"      element={<RequireAnalysis><NetworkPage /></RequireAnalysis>} />
            <Route path="/analytics"    element={<RequireAnalysis><AnalyticsPage /></RequireAnalysis>} />
            <Route path="/governance"   element={<RequireAnalysis><GovernancePage /></RequireAnalysis>} />
            <Route path="/settings"     element={<SettingsPage />} />
            <Route path="/support-us"   element={<Support />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
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
