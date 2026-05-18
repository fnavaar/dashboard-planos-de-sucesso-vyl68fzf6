import { useState } from 'react'
import { Cliente } from '@/services/clients'
import { Plano, generatePlan } from '@/services/planos'
import { Etapa, updateEtapaStatus } from '@/services/etapas'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Sparkles, CheckCircle, Clock, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'

interface Props {
  client: Cliente
  plano: Plano | null
  etapas: Etapa[]
  onUpdate: () => void
  onConfetti: () => void
}

export function KanbanBoard({ client, plano, etapas, onUpdate, onConfetti }: Props) {
  const [generating, setGenerating] = useState(false)
  const isMobile = useIsMobile()

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true)
      await generatePlan(client.id)
      toast.success('Plano gerado com sucesso!')
      onUpdate()
    } catch (err) {
      toast.error('Erro ao gerar plano. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDrop = async (e: React.DragEvent, status: Etapa['status']) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    await handleMove(id, status)
  }

  const handleMove = async (id: string, status: Etapa['status']) => {
    const etapa = etapas.find((e) => e.id === id)
    if (etapa && etapa.status !== status) {
      if (status === 'concluido') onConfetti()
      try {
        await updateEtapaStatus(id, status)
      } catch (err) {
        toast.error('Erro ao mover etapa')
      }
    }
  }

  if (!plano) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center bg-indigo-50/50 dark:bg-indigo-950/20 border-dashed border-2 border-indigo-200 dark:border-indigo-900">
        <Sparkles className="w-12 h-12 text-indigo-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Nenhum plano criado ainda</h3>
        <p className="text-slate-500 mb-6 max-w-md">
          Utilize nossa IA para gerar um plano de sucesso gamificado e personalizado baseado nos
          objetivos do cliente.
        </p>
        <Button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-6 shadow-elevation"
        >
          {generating ? 'Gerando Plano...' : 'Gerar Plano com IA'}
          {!generating && <Sparkles className="w-5 h-5 ml-2" />}
        </Button>
      </Card>
    )
  }

  const cols = [
    { id: 'a_fazer' as const, title: 'A Fazer', color: 'bg-slate-100', dot: 'bg-slate-400' },
    {
      id: 'em_progresso' as const,
      title: 'Em Progresso',
      color: 'bg-indigo-50',
      dot: 'bg-indigo-500',
    },
    { id: 'concluido' as const, title: 'Concluído', color: 'bg-emerald-50', dot: 'bg-emerald-500' },
  ]

  const ColumnContent = ({ status, color, dot, title }: any) => (
    <div
      className={`rounded-xl p-4 min-h-[500px] flex flex-col gap-3 ${color} dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 transition-colors`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, status)}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <h3 className="font-bold text-slate-700 dark:text-slate-300">{title}</h3>
        <span className="ml-auto bg-white/60 dark:bg-slate-800 px-2 text-xs font-semibold rounded-full text-slate-500">
          {etapas.filter((e) => e.status === status).length}
        </span>
      </div>

      {etapas
        .filter((e) => e.status === status)
        .map((etapa) => (
          <KanbanCard
            key={etapa.id}
            etapa={etapa}
            onDragStart={handleDragStart}
            onMove={handleMove}
          />
        ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Plano de Execução</h2>
      </div>

      {isMobile ? (
        <Tabs defaultValue="a_fazer" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="a_fazer">A Fazer</TabsTrigger>
            <TabsTrigger value="em_progresso">Em Progr.</TabsTrigger>
            <TabsTrigger value="concluido">Concluído</TabsTrigger>
          </TabsList>
          {cols.map((c) => (
            <TabsContent key={c.id} value={c.id}>
              <ColumnContent {...c} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {cols.map((c) => (
            <ColumnContent key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  )
}

function KanbanCard({
  etapa,
  onDragStart,
  onMove,
}: {
  etapa: Etapa
  onDragStart: (e: React.DragEvent, id: string) => void
  onMove: (id: string, status: Etapa['status']) => void
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, etapa.id)}
      className="p-4 cursor-grab active:cursor-grabbing hover:shadow-subtle hover:-translate-y-0.5 transition-all bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 relative overflow-hidden group"
    >
      {etapa.status === 'concluido' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
      )}
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-snug">
          {etapa.titulo}
        </h4>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {etapa.status !== 'a_fazer' && (
              <DropdownMenuItem onClick={() => onMove(etapa.id, 'a_fazer')}>
                Mover para A Fazer
              </DropdownMenuItem>
            )}
            {etapa.status !== 'em_progresso' && (
              <DropdownMenuItem onClick={() => onMove(etapa.id, 'em_progresso')}>
                Mover para Em Progresso
              </DropdownMenuItem>
            )}
            {etapa.status !== 'concluido' && (
              <DropdownMenuItem onClick={() => onMove(etapa.id, 'concluido')}>
                Mover para Concluído
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-slate-500 mb-4 line-clamp-2" title={etapa.descricao}>
        {etapa.descricao}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 px-2 py-1 rounded-md text-[10px] font-medium">
          <Clock className="w-3 h-3" /> {etapa.tempo_estimado || 'N/D'}
        </span>
        {etapa.status === 'concluido' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
      </div>
    </Card>
  )
}
