// ============================================================
// AUDITOR CONFIG — configuração da varredura de times (poller).
// Salva em poller_config no Supabase (mesmo banco do Painel).
// Visível para todos os usuários (politica preferida).
// Desenvolvido e implementado por: EES — Enderson E. Souza.
// ============================================================

import { useEffect, useState } from 'react'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { listarTeams } from '../lib/auditor'
import { AuditorTitle, AuditorFooter } from './AuditorLayout'

export default function AuditorConfig() {
  const [teams, setTeams] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    async function init() {
      const [teamData, cfgData] = await Promise.all([
        listarTeams().catch(() => []),
        supabase.from('poller_config').select('team_ids').eq('id', 1).maybeSingle(),
      ])
      setTeams(Array.isArray(teamData) ? teamData : [])
      const ids = Array.isArray(cfgData?.data?.team_ids) ? cfgData.data.team_ids : []
      setSelected(ids.length ? String(ids[ids.length - 1]) : '')
      setLoading(false)
    }
    init()
  }, [])

  async function salvar() {
    setSaving(true)
    try {
      const teamIds = selected === '' ? [] : [Number(selected)]
      const { data: existing } = await supabase.from('poller_config').select('id').eq('id', 1).maybeSingle()
      if (existing) {
        await supabase.from('poller_config').update({ team_ids: teamIds, updated_at: new Date().toISOString() }).eq('id', 1)
      } else {
        await supabase.from('poller_config').insert({ id: 1, team_ids: teamIds })
      }
      setStatus('Times atualizados!')
      setTimeout(() => setStatus(''), 4000)
    } catch {
      setStatus('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AuditorTitle />

      <div className="rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800">Varredura de times</h3>
        <p className="mt-1 text-xs text-slate-500">
          Defina qual time o sistema verifica para gerar alertas do número prioritário. Deixe vazio para varrer todos os times (recomendado).
        </p>

        <div className="mt-4 flex items-center gap-2">
          <select
            className="field"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading}
          >
            <option value="">Todos os times (recomendado)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name || t.title || t.label || t.id}</option>
            ))}
          </select>
          <button className="btn-primary shrink-0" onClick={salvar} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
        </div>

        {status && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <CheckCircle2 size={15} /> {status}
          </p>
        )}
      </div>

      <AuditorFooter />
    </div>
  )
}