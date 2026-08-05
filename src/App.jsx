import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Auth from './components/Auth'
import Dashboard from './pages/Dashboard'
import Kanban from './pages/Kanban'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'

function Loader() {
  return (
    <div className="bg-space flex min-h-screen items-center justify-center">
      <div className="dial h-10 w-10 animate-spin rounded-full opacity-80 blur-[1px]" />
    </div>
  )
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Auth />
  return <Layout />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}