import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, LogOut, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABEL, AREA_BAR } from '../lib/constants'
import { initials } from '../lib/format'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/kanban', label: 'Kanban', icon: Kanban },
  { to: '/clientes', label: 'Clientes', icon: Users },
]

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <div className="neon-border dial flex h-9 w-9 items-center justify-center rounded-xl text-slate-900">
        <Zap size={20} strokeWidth={2.5} />
      </div>
      <div>
        <div className="glow-text text-sm font-extrabold tracking-wide">PAINEL</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">Implantação</div>
      </div>
    </div>
  )
}

function UserChip() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const role = profile?.role || 'tecnica'
  const name = profile?.name || 'Usuário'

  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-slate-950 ${
            role === 'treinamento'
              ? 'from-fuchsia-400 to-violet-500'
              : role === 'admin'
                ? 'from-amber-300 to-orange-500'
                : AREA_BAR.tecnica
          }`}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="text-[11px] text-slate-400">{ROLE_LABEL[role] || role}</div>
        </div>
        <button
          onClick={async () => {
            await signOut()
            navigate('/dashboard')
          }}
          title="Sair"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="bg-space flex min-h-screen">
      <aside className="glass-strong sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between gap-6 p-4 lg:flex">
        <div className="flex flex-col gap-8">
          <Brand />
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'text-slate-50'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-gradient-to-b from-cyan-400 to-indigo-400 shadow-[0_0_12px_rgba(124,140,255,0.8)]" />
                    )}
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <UserChip />
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
                    isActive ? 'text-cyan-300' : 'text-slate-400'
                  }`
                }
              >
                <Icon size={17} />
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