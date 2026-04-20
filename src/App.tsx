import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth-store'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { ViralProductsPage } from './pages/ViralProductsPage'
import { ViralVideosPage } from './pages/ViralVideosPage'
import { ViralCreatorsPage } from './pages/ViralCreatorsPage'
import { StudioPage } from './pages/StudioPage'
import { BoostersPage } from './pages/BoostersPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { ReferralPage } from './pages/ReferralPage'
import { CreditsPage } from './pages/CreditsPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminTemplates } from './pages/admin/AdminTemplates'
import { AdminGenerations } from './pages/admin/AdminGenerations'
import { AdminBoosters } from './pages/admin/AdminBoosters'
import { AdminReferrals } from './pages/admin/AdminReferrals'
import { AdminLogs } from './pages/admin/AdminLogs'
import { AdminSettings } from './pages/admin/AdminSettings'

export default function App() {
  const initialize = useAuthStore((s: { initialize: () => Promise<void> }) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#1a1828',
            border: '1px solid rgba(255,255,255,0.05)',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/viral-products" element={<ViralProductsPage />} />
          <Route path="/viral-videos" element={<ViralVideosPage />} />
          <Route path="/viral-creators" element={<ViralCreatorsPage />} />
          <Route path="/influencer" element={<StudioPage />} />
          <Route path="/booster" element={<BoostersPage />} />
          <Route path="/booster/:tool" element={<PlaceholderPage title="Booster" />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/credits" element={<CreditsPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="credits" element={<AdminGenerations />} />
            <Route path="generations" element={<AdminGenerations />} />
            <Route path="templates" element={<AdminTemplates />} />
            <Route path="boosters" element={<AdminBoosters />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/40">Em desenvolvimento...</p>
      </div>
    </div>
  )
}
