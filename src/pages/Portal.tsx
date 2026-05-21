import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCliente, Cliente } from '@/services/clients'
import { getPlanos, Plano } from '@/services/planos'
import { getEtapas, Etapa } from '@/services/etapas'
import { getCardsExecucao, CardExecucao } from '@/services/cards_execucao'
import { useAuth } from '@/hooks/use-auth'
import { ProgressMap } from '@/components/ProgressMap'
import { KanbanBoard } from '@/components/KanbanBoard'
import { useRealtime } from '@/hooks/use-realtime'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { AlertCircle, Target, User } from 'lucide-react'

export default function Portal() {
  const { email } = useParams()
  const { user } = useAuth()
  const [client, setClient] = useState<Cliente | null>(null)
  const [plano, setPlano] = useState<Plano | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [cards, setCards] = useState<CardExecucao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = async () => {
    if (!email) return
    if (user?.role !== 'admin' && user?.email !== email) {
      setError(true)
      setLoading(false)
      return
    }
    try {
      const { getClienteByEmail } = await import('@/services/clients')
      const c = await getClienteByEmail(email)
      setClient(c)

      const ps = await getPlanos(c.id)
      const p = ps[0] || null
      setPlano(p)

      if (p) {
        const es = await getEtapas(p.id)
        setEtapas(es)
        const eIds = es.map((e) => e.id)
        if (eIds.length > 0) {
          const cs = await getCardsExecucao(eIds)
          setCards(cs)
        } else {
          setCards([])
        }
      } else {
        setEtapas([])
        setCards([])
      }
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [email, user])

  useRealtime('clientes', () => fetchData())
  useRealtime('planos', () => fetchData())
  useRealtime('etapas', () => fetchData())
  useRealtime('cards_execucao', () => fetchData())

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Erro ao carregar plano. Tente novamente.
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Não foi possível carregar as informações do seu portal no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in-up">
      {/* Portal Header */}
      <Card className="p-6 md:p-8 border-none bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md transition-all duration-300">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0 border-2 border-white/40 shadow-sm">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <h1 className="text-3xl font-bold text-white leading-tight">{client.nome}</h1>
            <div>
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">
                Objetivo Principal
              </p>
              <p className="text-white text-base md:text-lg">
                {client.objetivo_principal || 'Ainda não definido'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!plano ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-2 border-slate-200 dark:border-slate-800">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            Seu plano ainda não foi criado. Aguarde contato da Adapta.
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md">
            Estamos preparando a melhor estratégia para o seu sucesso. Em breve seu mapa de
            progresso estará disponível aqui.
          </p>
        </Card>
      ) : (
        <>
          <ProgressMap plano={plano} etapas={etapas} readOnly />
          <KanbanBoard
            client={client}
            plano={plano}
            etapas={etapas}
            cards={cards}
            onUpdate={fetchData}
            onConfetti={() => {}}
            readOnly
          />
        </>
      )}
    </div>
  )
}
