import { X } from 'lucide-react'
import { ROLE_SOLID } from '../lib/constants'

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`glass-strong relative max-h-[90vh] w-full overflow-y-auto rounded-2xl p-5 sm:p-6 ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="dial h-8 w-8 animate-spin rounded-full opacity-70" />
}

export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 py-10 text-center">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function Avatar({ name, role, size = 'md' }) {
  const sizes = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  }
  const solid = ROLE_SOLID[role] || 'bg-slate-500'
  const firstName = (name || '?').split(' ')[0]
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizes[size]} ${solid}`}
      title={name || 'Sem responsável'}
    >
      {firstName.charAt(0).toUpperCase()}
    </div>
  )
}