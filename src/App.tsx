import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth-store'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { ViralProductsPage } from './pages/ViralProductsPage'
import { ViralProductDetailPage } from './pages/ViralProductDetailPage'
import { ViralVideosPage } from './pages/ViralVideosPage'
import { ViralCreatorsPage } from './pages/ViralCreatorsPage'
import { StudioPage } from './pages/StudioPage'
import { BoostersPage } from './pages/BoostersPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { ReferralPage } from './pages/ReferralPage'
import { CreditsPage } from './pages/CreditsPage'
import { BoosterDetailPage } from './pages/BoosterDetailPage'
import { EditImagePage } from './pages/EditImagePage'
import { VideosIaPage } from './pages/VideosIaPage'
import { FilmesIaPage } from './pages/FilmesIaPage'
import { AvatarVideosPage } from './pages/AvatarVideosPage'
import { ImitarMovimentoPage } from './pages/ImitarMovimentoPage'
import { AvatarCreatorPage } from './pages/AvatarCreatorPage'
import { PeleUltraPage } from './pages/PeleUltraPage'
import { SoraRemoverPage } from './pages/SoraRemoverPage'
import { ClonagemVozPage } from './pages/ClonagemVozPage'
import { TranscricaoPage } from './pages/TranscricaoPage'
import { InfluencerLabPage } from './pages/InfluencerLabPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminTemplates } from './pages/admin/AdminTemplates'
import { AdminGenerations } from './pages/admin/AdminGenerations'
import { AdminBoosters } from './pages/admin/AdminBoosters'
import { AdminReferrals } from './pages/admin/AdminReferrals'
import { AdminLogs } from './pages/admin/AdminLogs'
import { AdminSettings } from './pages/admin/AdminSettings'
import { AdminViralProducts } from './pages/admin/AdminViralProducts'
import { AdminViralVideos } from './pages/admin/AdminViralVideos'
import { AdminViralCreators } from './pages/admin/AdminViralCreators'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { PublicCheckoutPage } from './pages/PublicCheckoutPage'

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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/comprar" element={<PublicCheckoutPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/viral-products" element={<ViralProductsPage />} />
          <Route path="/viral-products/:id" element={<ViralProductDetailPage />} />
          <Route path="/viral-videos" element={<ViralVideosPage />} />
          <Route path="/viral-creators" element={<ViralCreatorsPage />} />
          <Route path="/influencer" element={<StudioPage />} />
          <Route path="/booster" element={<BoostersPage />} />
          <Route path="/booster/edit-image" element={<EditImagePage />} />
          <Route path="/booster/influencer-lab" element={<InfluencerLabPage />} />
          <Route path="/booster/avatar-video" element={<AvatarVideosPage />} />
          <Route path="/booster/avatar-creator" element={<AvatarCreatorPage />} />
          <Route path="/booster/pele-ultra" element={<PeleUltraPage />} />
          <Route path="/booster/sora-remover" element={<SoraRemoverPage />} />
          <Route path="/booster/clonagem-voz" element={<ClonagemVozPage />} />
          <Route path="/booster/transcricao" element={<TranscricaoPage />} />
          <Route path="/booster/motion" element={<ImitarMovimentoPage />} />
          <Route path="/booster/videos-ia" element={<VideosIaPage />} />
          <Route path="/booster/filmes-ia" element={<FilmesIaPage />} />
          {/* Aliases legados pra evitar 404 em links antigos */}
          <Route path="/booster/grok" element={<Navigate to="/booster/videos-ia" replace />} />
          <Route path="/booster/veo" element={<Navigate to="/booster/avatar-video" replace />} />
          <Route path="/booster/kling" element={<Navigate to="/booster/filmes-ia" replace />} />
          <Route path="/booster/:tool" element={<BoosterDetailPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/credits" element={<CreditsPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="credits" element={<AdminGenerations />} />
            <Route path="generations" element={<AdminGenerations />} />
            <Route path="viral-products" element={<AdminViralProducts />} />
            <Route path="viral-videos" element={<AdminViralVideos />} />
            <Route path="viral-creators" element={<AdminViralCreators />} />
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

