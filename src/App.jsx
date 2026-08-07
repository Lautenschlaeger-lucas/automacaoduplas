import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Auth from './components/Auth'
import Dashboard from './pages/Dashboard'
import Kanban from './pages/Kanban'
import ProjectDetail from './pages/ProjectDetail'
import ImportCsv from './pages/ImportCsv'
import AuditorLayout from './pages/AuditorLayout'
import AuditorAuditoria from './pages/AuditorAuditoria'
import AuditorMonitor from './pages/AuditorMonitor'
import AuditorConfig from './pages/AuditorConfig'

function Loader() {
  return (
    <div className="bg-space flex min-h-screen items-center justify-center">
      <div className="dial h-10 w-10 animate-spin rounded-full opacity-70" />
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
          <Route path="/importar" element={<ImportCsv />} />
          <Route path="/projetos/:codigo" element={<ProjectDetail />} />
          <Route path="/auditor" element={<AuditorLayout />}>
            <Route path="" element={<AuditorMonitor />} />
            <Route path="auditoria" element={<AuditorAuditoria />} />
            <Route path="config" element={<AuditorConfig />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}