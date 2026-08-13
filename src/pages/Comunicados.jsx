import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Send, MailOpen, ExternalLink, GraduationCap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, timeAgo } from '../lib/format'
import { Spinner, EmptyState, Avatar } from '../components/ui'

const SELECT = '*, remetente:profiles!comunicados_remetente_id_fkey(name, role), destinatario:profiles!comunicados_destinatario_id_fkey(name, role)'

function ComunicadoItem({ c, incoming }) {
  const [lida, setLida] = useState(!c.lido_em)

  async function marcarLida() {
    if (c.lido_em) return
    const { error } = await supabase.from('comunicados').update({ lido_em: new Date().toISOString() }).eq('id', c.id)
    if (!error) setLida(true)
  }

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition ${
        incoming && !c.lido_em ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Avatar name={incoming ? c.remetente?.name : c.destinatario?.name} role={incoming ? c.remetente?.role : c.destinatario?.role} size="sm" />
        <span className="text-xs font-semibold text-slate-700">
          {incoming ? c.remetente?.name : c.destinatario?.name || 'Analista'}
        </span>
        <Link
          to={`/projetos/${c.codigo_cliente}`}
          className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200"
        >
          #{c.codigo_cliente} <ExternalLink size={10} />
        </Link>
        <span className="ml-auto text-[10px] text-slate-400">{timeAgo(c.criado_em)}</span>
      </div>
      <p className="text-xs leading-snug text-slate-600">{c.mensagem || 'Cliente concluído na etapa de treinamento.'}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Enviado em {formatDateTime(c.criado_em)}</span>
        {incoming && !c.lido_em && (
          <button
            onClick={marcarLida}
            className="ml-auto flex items-center gap-1 rounded-md border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 transition hover:bg-blue-50"
          >
            <MailOpen size={11} /> Marcar como lido
          </button>
        )}
        {incoming && c.lido_em && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            <MailOpen size={11} /> Lido
          </span>
        )}
      </div>
    </div>
  )
}

export default function Comunicados() {
  const { user } = useAuth()
  const [recebidos, setRecebidos] = useState(null)
  const [enviados, setEnviados] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    async function load() {
      const [r, e] = await Promise.all([
        supabase.from('comunicados').select(SELECT).eq('destinatario_id', user.id).order('criado_em', { ascending: false }),
        supabase.from('comunicados').select(SELECT).eq('remetente_id', user.id).order('criado_em', { ascending: false }),
      ])
      if (!active) return
      setRecebidos(r.data || [])
      setEnviados(e.data || [])
    }
    load()
    const chan = supabase
      .channel('comunicados-user')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => load())
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(chan)
    }
  }, [user])

  if (!recebidos || !enviados) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const naoLidos = recebidos.filter((c) => !c.lido_em).length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
          <GraduationCap size={20} className="text-violet-600" />
          Comunicados
        </h1>
        <p className="text-sm text-slate-400">
          Avisos de conclusão de treinamento enviados a você e por você.
        </p>
      </div>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Inbox size={15} className="text-blue-600" />
          Recebidos
          {naoLidos > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {naoLidos} novos
            </span>
          )}
        </h2>
        {recebidos.length === 0 ? (
          <EmptyState title="Nenhum comunicado recebido" hint="Quando um cliente for concluído no treinamento, o analista recebe o aviso aqui." />
        ) : (
          <div className="flex flex-col gap-2">
            {recebidos.map((c) => (
              <ComunicadoItem key={c.id} c={c} incoming />
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Send size={15} className="text-violet-600" />
          Enviados
        </h2>
        {enviados.length === 0 ? (
          <EmptyState title="Nenhum comunicado enviado" />
        ) : (
          <div className="flex flex-col gap-2">
            {enviados.map((c) => (
              <ComunicadoItem key={c.id} c={c} incoming={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}