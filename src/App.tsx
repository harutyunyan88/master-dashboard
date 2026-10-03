import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'

import { getToken } from './api/client.ts'
import BottomNav from './components/BottomNav.tsx'
import Client from './pages/Client.tsx'
import Clients from './pages/Clients.tsx'
import Dashboard from './pages/Dashboard.tsx'
import History from './pages/History.tsx'
import Login from './pages/Login.tsx'
import Stats from './pages/Stats.tsx'

function ProtectedLayout() {
  if (!getToken()) return <Navigate to="/login" replace />
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:clientId" element={<Client />} />
          <Route path="/stats" element={<Stats />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
