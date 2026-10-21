import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const db = supabase as any
const input = 'rounded-md border border-input bg-background p-2 text-sm'
const btn = 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
const btn2 = 'rounded-md border border-border px-2 py-1 text-xs'

export async function loadOperators() {
  const { data: roles } = await db.from('user_roles').select('user_id,permissions,role')
  const ids = [...new Set((roles || []).filter((r: any) => r.role === 'admin' || (r.permissions || []).some((p: string) => p === 'pos' || p === 'pos_supervisor')).map((r: any) => r.user_id))]
  if (!ids.length) return []
  const { data: prof } = await db.from('profiles').select('id,full_name,email').in('id', ids)
  return ids.map((id) => { const p = (prof || []).find((x: any) => x.id === id); return { id, label: p?.full_name || p?.email || String(id).slice(0, 8), email: p?.email } })
}

export function TerminalsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [ops, setOps] = useState<any[]>([])
  const [form, setForm] = useState({ code: '', name: '', branch: 'Matriz — Teresópolis/RJ', is_test: false })
  const [edit, setEdit] = useState<any>(null)
  const load = useCallback(async () => {
    const [{ data: t }, { data: s }] = await Promise.all([db.from('pos_terminals').select('*').order('code'), db.from('pos_sessions').select('terminal_id').eq('status', 'open')])
    setRows((t || []).map((x: any) => ({ ...x, open: (s || []).some((y: any) => y.terminal_id === x.id) })))
  }, [])
  useEffect(() => { load(); loadOperators().then(setOps) }, [load])
  const create = async () => {
    const { error } = await db.rpc('pos_create_terminal', { p_code: form.code, p_name: form.name, p_branch: form.branch, p_is_test: form.is_test })
    error ? toast.error(error.message) : (toast.success('Terminal cadastrado (desativado para produção)'), setForm({ ...form, code: '', name: '' }), load())
  }
  const saveEdit = async () => {
    const { error } = await db.rpc('pos_update_terminal', { p_terminal: edit.id, p_name: edit.name, p_branch: edit.branch, p_active: edit.active, p_operators: edit.authorized_operators })
    error ? toast.error(error.message) : (toast.success('Terminal atualizado'), setEdit(null), load())
  }
  const toggle = async (t: any) => {
    if (!t.production_enabled && !confirm(`Autorizar o terminal ${t.code} para vendas REAIS?`)) return
    const { error } = await db.rpc('pos_set_terminal_production', { p_terminal: t.id, p_enabled: !t.production_enabled })
    error ? toast.error(error.message) : (toast.success('Terminal atualizado'), load())
  }
  const opName = (id: string) => ops.find((o) => o.id === id)?.label || id.slice(0, 8)
  return (
    <div>
      <section className="mb-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">Cadastrar terminal</h2>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label>Código<br /><input className={input} placeholder="CX01" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label>
          <label>Nome<br /><input className={input} placeholder="Caixa 1 — entrada" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Filial<br /><input className={input} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_test} onChange={(e) => setForm({ ...form, is_test: e.target.checked })} /> Terminal de testes</label>
          <button className={btn} onClick={create}>Cadastrar</button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Todo terminal novo nasce desativado para produção. Para ativar: vincule o computador em <Link to="/preparacao-caixa" className="underline">Preparação do Caixa</Link>, autorize operadores, faça os testes manuais e então autorize aqui.</p>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">Terminais</h2>
        <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Código</th><th>Nome / filial</th><th>Ambiente</th><th>Computador</th><th>Operadores</th><th>Sessão</th><th>Última atividade</th><th>Cadastro</th><th></th></tr></thead>
          <tbody>{rows.map((t) => <tr key={t.id} className="border-b border-border/50 align-top">
            <td className="font-bold">{t.code}</td><td>{t.name}<br /><span className="text-xs text-muted-foreground">{t.branch}</span></td>
            <td>{!t.active ? 'Inativo' : t.is_test ? 'Testes' : t.production_enabled ? 'Produção' : 'Aguardando autorização'}</td>
            <td>{t.device_hash ? `Vinculado ${t.device_bound_at ? new Date(t.device_bound_at).toLocaleDateString('pt-BR') : ''}` : 'Não vinculado'}</td>
            <td className="text-xs">{t.authorized_operators?.length ? t.authorized_operators.map(opName).join(', ') : '—'}</td>
            <td>{t.open ? 'Aberta' : 'Fechada'}</td>
            <td className="text-xs">{t.last_activity_at ? new Date(t.last_activity_at).toLocaleString('pt-BR') : '—'}</td>
            <td className="text-xs">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
            <td className="space-x-1 whitespace-nowrap"><button className={btn2} onClick={() => setEdit({ ...t })}>Editar</button>{!t.is_test && <button className={btn2} onClick={() => toggle(t)}>{t.production_enabled ? 'Suspender' : 'Autorizar produção'}</button>}</td>
          </tr>)}</tbody></table></div>
      </section>
      {edit && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4"><div className="w-full max-w-lg rounded-xl bg-card p-4">
        <h3 className="mb-2 font-bold">Editar {edit.code}</h3>
        <label className="mb-2 block text-sm">Nome<input className={`${input} w-full`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
        <label className="mb-2 block text-sm">Filial<input className={`${input} w-full`} value={edit.branch} onChange={(e) => setEdit({ ...edit, branch: e.target.value })} /></label>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Ativo</label>
        <p className="mb-1 text-sm font-medium">Operadores autorizados</p>
        <div className="mb-3 max-h-48 overflow-auto rounded border border-border p-2 text-sm">{ops.length ? ops.map((o) => <label key={o.id} className="flex items-center gap-2"><input type="checkbox" checked={edit.authorized_operators.includes(o.id)} onChange={(e) => setEdit({ ...edit, authorized_operators: e.target.checked ? [...edit.authorized_operators, o.id] : edit.authorized_operators.filter((x: string) => x !== o.id) })} />{o.label} <span className="text-xs text-muted-foreground">{o.email}</span></label>) : <p className="text-muted-foreground">Nenhum usuário com perfil de caixa. Dê o perfil “Operador de Caixa” em Admin → Cargos.</p>}</div>
        <div className="flex gap-2"><button className={btn} onClick={saveEdit}>Salvar</button><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setEdit(null)}>Cancelar</button></div>
      </div></div>}
    </div>
  )
}
