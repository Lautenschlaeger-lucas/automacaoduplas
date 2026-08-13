import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Kanban, LogOut, Zap, Upload, MessageCircle, PanelLeftClose, PanelLeftOpen, Inbox } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ROLE_LABEL, ROLE_SOLID } from '../lib/constants'
import { initials } from '../lib/format'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/kanban', label: 'Kanban', icon: Kanban },
  { to: '/importar', label: 'Importar CSV', icon: Upload },
  { to: '/comunicados', label: 'Comunicados', icon: Inbox },
  { to: '/auditor', label: 'Monitor ChatWoot', icon: MessageCircle },
]

function Brand({ collapsed }) {
  return (
    <div className={`flex items-center px-2 py-1 ${collapsed ? 'justify-center' : 'gap-3'}`}>
      <div className="dial flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
        <Zap size={20} strokeWidth={2.5} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="text-sm font-extrabold tracking-wide text-slate-800">PAINEL</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">Implantação</div>
        </div>
      )}
    </div>
  )
}

function UserChip({ collapsed }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const role = profile?.role || 'tecnica'
  const name = profile?.name || 'Usuário'
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/dashboard')
  }

  if (collapsed) {
    return (
      <div className="relative flex justify-center">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`group relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition ring-2 ${
            open ? 'ring-blue-500' : 'ring-slate-200 hover:ring-slate-300'
          } ${ROLE_SOLID[role] || 'bg-slate-500'}`}
        >
          {initials(name)}
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {open ? 'Fechar' : 'Menu do usuário'}
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-full top-0 z-40 ml-3 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ROLE_SOLID[role] || 'bg-slate-500'}`}>
                  {initials(name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{name}</div>
                  <div className="text-[11px] text-slate-400">{ROLE_LABEL[role] || role}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="mt-3 flex w-full items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
              >
                <LogOut size={15} /> Sair
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ROLE_SOLID[role] || 'bg-slate-500'}`}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-800">{name}</div>
          <div className="text-[11px] text-slate-400">{ROLE_LABEL[role] || role}</div>
        </div>
        <button
          onClick={handleSignOut}
          title="Sair"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

const COLLAPSED_KEY = 'sidebar_collapsed'

export default function Layout() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [naoLidos, setNaoLidos] = useState(0)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { count } = await supabase
        .from('comunicados')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', user.id)
        .is('lido_em', null)
      setNaoLidos(count || 0)
    }
    load()
    const chan = supabase
      .channel('layout-comunicados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(chan)
  }, [user])

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div className="bg-space flex min-h-screen">
      <aside
        className={`glass-strong sticky top-0 hidden h-screen shrink-0 flex-col justify-between gap-6 p-4 transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[76px]' : 'w-60'
        }`}
      >
        <div className="flex flex-col gap-8">
          <Brand collapsed={collapsed} />
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    collapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-blue-600" />
                    )}
                    <Icon size={18} className={isActive ? 'shrink-0 text-blue-600' : 'shrink-0 text-slate-400 group-hover:text-slate-500'} />
                    {!collapsed && label}
                    {!collapsed && to === '/comunicados' && naoLidos > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                        {naoLidos}
                      </span>
                    )}
                    {collapsed && to === '/comunicados' && naoLidos > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                        {label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <UserChip collapsed={collapsed} />
          <button
            onClick={toggleCollapsed}
            className="group relative self-end rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className={`pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${
              collapsed ? 'left-full ml-3' : 'right-full mr-3'
            }`}>
              {collapsed ? 'Expandir menu' : 'Recolher menu'}
            </span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass-strong sticky top-0 z-20 flex items-center justify-between gap-3 border-x-0 border-t-0 px-5 py-3 lg:hidden">
          <Brand />
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`
                }
              >
                <span className="relative">
                  <Icon size={17} />
                  {to === '/comunicados' && naoLidos > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                      {naoLidos}
                    </span>
                  )}
                </span>
                {label}
              </NavLink>
            ))}
          </nav>
          <UserChip />
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}