// ============================================================
// AUDITOR LAYOUT — container do modulo Auditor com submenu de
// tabs (Auditoria | Monitoramento | Configuracao), titulo e
// rodape de assinatura.
// Desenvolvido e implementado por: EES — Enderson E. Souza.
// ============================================================

import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardCheck, Activity, Settings } from 'lucide-react'

const TABS = [
  { to: '/auditor', label: 'Monitoramento', icon: Activity, end: true },
  { to: '/auditor/auditoria', label: 'Auditoria', icon: ClipboardCheck, end: true },
  { to: '/auditor/config', label: 'Configuração', icon: Settings, end: false },
]

export function AuditorFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 pb-10 pt-4 text-center">
      <p className="text-xs font-medium text-slate-400">
        Monitor ChatWoot · módulo integrado ao Painel de Implantação
        <span className="mx-2 text-slate-300">•</span>
        Desenvolvido e implementado por: <span className="font-bold text-slate-600">EES-EndersonESouza</span>
      </p>
    </footer>
  )
}

export function AuditorTitle() {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Monitor ChatWoot</h1>
      <p className="text-sm text-slate-400">Monitoramento e auditoria de atendimento via IA</p>
    </div>
  )
}

export default function AuditorLayout() {
  return (
    <div>
      <nav className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-1.5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}