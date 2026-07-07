import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MaintenanceBanner } from './MaintenanceBanner'
import { CreditsExhaustedModal } from '../CreditsExhaustedModal'
import { useHeartbeat } from '../../hooks/useHeartbeat'

export function AppLayout() {
  useHeartbeat()
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex-1 ml-16 md:ml-60 flex flex-col min-w-0">
        <Header />
        {/* E65: banner de "app em atualização" 22h-5h */}
        <MaintenanceBanner />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      {/* E65: modal "créditos esgotados" (cap oculto) — global */}
      <CreditsExhaustedModal />
    </div>
  )
}
