import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import RateLimitBanner from './components/RateLimitBanner'
import Footer from './components/layout/Footer'
import { Spinner } from './components/UI'

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const RepositoriesPage = lazy(() => import('./pages/RepositoriesPage'))
const ContributorsPage = lazy(() => import('./pages/ContributorsPage'))
const ContributorProfilePage = lazy(() => import('./pages/ContributorProfilePage'))
const NetworkPage = lazy(() => import('./pages/NetworkPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const GovernancePage = lazy(() => import('./pages/GovernancePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const Support = lazy(() => import('./pages/Support'))

function Layout({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Navbar />
      <RateLimitBanner />

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <Footer />
    </div>
  )
}

function AppContent() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div
            role="status"
            aria-label="Loading page"
            style={{
              minHeight: '60vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/repositories" element={<RepositoriesPage />} />
          <Route path="/contributors" element={<ContributorsPage />} />
          <Route
            path="/contributors/:username"
            element={<ContributorProfilePage />}
          />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/governance" element={<GovernancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/support-us" element={<Support />} />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Suspense>
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