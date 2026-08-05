import { Link } from 'react-router-dom'
import { MessageSquare, Flag } from 'lucide-react'
import {
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  STATUS_CHIP,
  STATUS_LABEL,
  STATUS_DOT,
  AREA_CHIP,
  AREA_LABEL,
} from '../lib/constants'
import { timeAgo } from '../lib/format'
import { Avatar } from './ui'

export function TicketCard({ ticket, showArea = false, onOpen }) {
  const client = ticket.clients
  const responsavel = ticket.responsavel
  const Wrap = onOpen ? 'div' : Link
  const props = onOpen
    ? { role: 'button', tabIndex: 0, onClick: () => onOpen(ticket), className: 'cursor-pointer' }
    : { to: `/clientes/${ticket.cliente_id}`, className: 'block' }

  return (
    <Wrap {...props} className="group">
      <div className="glass neon-border relative rounded-xl p-3 transition group-hover:-translate-y-0.5 group-hover:border-cyan-400/30 group-hover:shadow-[0_8px_30px_rgba(124,140,255,0.18)]">
        <div className="mb-1.5 flex items-center gap-2">
          {client && (
            <span className="flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
              #{client.codigo}
            </span>
          )}
          {showArea && (
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${AREA_CHIP[ticket.area]}`}>
              {AREA_LABEL[ticket.area]}
            </span>
          )}
          <span className={`ml-auto flex items-center gap-1 text-[10px] font-semibold capitalize ${PRIORITY_BADGE[ticket.prioridade]}`}>
            <Flag size={10} />
            {PRIORITY_LABEL[ticket.prioridade]}
          </span>
        </div>

        <h3 className="mb-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-100">
          {ticket.titulo}
        </h3>
        {ticket.descricao && (
          <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-slate-500">{ticket.descricao}</p>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CHIP[ticket.status]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ticket.status]}`} />
            {STATUS_LABEL[ticket.status]}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <MessageSquare size={11} />
            {timeAgo(ticket.atualizado_em)}
            <Avatar name={responsavel?.name} role={responsavel?.role} size="sm" />
          </div>
        </div>
      </div>
    </Wrap>
  )
}