import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCliente, Cliente } from '@/services/clients'
import { getPlanos, Plano } from '@/services/planos'
import { getEtapas, Etapa } from '@/services/etapas'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { ClientHeader } from '@/components/ClientHeader'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ProgressMap } from '@/components/ProgressMap'
import { Confetti } from '@/components/Confetti'

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Cliente | null>(null)
  const [plano, setPlano] = useState<Plano | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])

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
      } else {
        setPlano(null)
        setEtapas([])
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

      <ProgressMap plano={plano} etapas={etapas} />

      <KanbanBoard
        client={client}
        plano={plano}
        etapas={etapas}
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
