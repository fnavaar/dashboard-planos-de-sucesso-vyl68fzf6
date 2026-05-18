import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCliente, Cliente } from '@/services/clients'
import { getPlanos, Plano } from '@/services/planos'
import { getEtapas, Etapa } from '@/services/etapas'
import { getCardsExecucao, CardExecucao } from '@/services/cards_execucao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Target, BookOpen } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { ClientHeader } from '@/components/ClientHeader'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ProgressMap } from '@/components/ProgressMap'
import { Confetti } from '@/components/Confetti'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Cliente | null>(null)
  const [plano, setPlano] = useState<Plano | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [cards, setCards] = useState<CardExecucao[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const c = await getCliente(id)
      setClient(c)

      const ps = await getPlanos(id)
      if (ps.length > 0) {
        setPlano(ps[0])
        const es = await getEtapas(ps[0].id)
        setEtapas(es)

        if (es.length > 0) {
          const cs = await getCardsExecucao(es.map((e) => e.id))
          setCards(cs)
        } else {
          setCards([])
        }
      } else {
        setPlano(null)
        setEtapas([])
        setCards([])
      }
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime('etapas', () => fetchData())
  useRealtime('planos', () => fetchData())
  useRealtime('clientes', () => fetchData())
  useRealtime('cards_execucao', () => fetchData())

  if (loading && !client) return <LoadingState />
  if (error || !client) return <ErrorState onBack={() => navigate('/')} />

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <Confetti active={showConfetti} />
      <div className="flex justify-between items-center -ml-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      <ClientHeader
        client={client}
        plano={plano}
        etapas={etapas}
        onUpdate={fetchData}
        onConfetti={() => {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <Target className="w-5 h-5 text-indigo-500" /> Objetivo Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300">
              {client.objetivo_principal || 'Nenhum objetivo definido.'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <BookOpen className="w-5 h-5 text-indigo-500" /> Contexto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {client.contexto || 'Nenhum contexto definido.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {etapas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 px-1">
            Mapeamento Estratégico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...etapas]
              .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
              .map((etapa) => (
                <Card
                  key={etapa.id}
                  className="bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md line-clamp-2">{etapa.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Objetivo:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                        {etapa.objetivo || 'Não definido'}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Descrição:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-3">
                        {etapa.descricao || 'Não definida'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      <ProgressMap plano={plano} etapas={etapas} />

      <KanbanBoard
        client={client}
        plano={plano}
        etapas={etapas}
        cards={cards}
        onUpdate={fetchData}
        onConfetti={() => {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

function ErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="text-center py-20 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Erro ao carregar dados</h2>
      <Button onClick={onBack} variant="outline">
        Voltar para o Dashboard
      </Button>
    </div>
  )
}
