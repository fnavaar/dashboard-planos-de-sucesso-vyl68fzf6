import { useState } from 'react'
import { Cliente } from '@/services/clients'
import { Plano } from '@/services/planos'
import { Etapa, updateEtapaStatus } from '@/services/etapas'
import { ExecutionDrawer } from '@/components/ExecutionDrawer'
import { GeneratePlanDialog } from '@/components/GeneratePlanDialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Sparkles, CheckCircle2, Circle, Loader2, ChevronDown, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  client: Cliente
  plano: Plano | null
  etapas: Etapa[]
  onUpdate: () => void
  onConfetti: () => void
}

export function KanbanBoard({ client, plano, etapas, onUpdate, onConfetti }: Props) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDrop = async (e: React.DragEvent, status: Etapa['status']) => {
    e.preventDefault()
    setDragOverCol(null)
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

  const [selectedEtapa, setSelectedEtapa] = useState<Etapa | null>(null)

  if (!plano) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center bg-indigo-50/50 dark:bg-indigo-950/20 border-dashed border-2 border-indigo-200 dark:border-indigo-900 transition-all duration-200">
        <Sparkles className="w-12 h-12 text-indigo-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Nenhum plano criado ainda</h3>
        <p className="text-slate-500 mb-6 max-w-md">
          Utilize nossa IA para gerar um plano de sucesso gamificado e personalizado baseado nos
          objetivos do cliente.
        </p>
        <GeneratePlanDialog
          client={client}
          onSuccess={() => {
            onUpdate()
            onConfetti()
          }}
          trigger={
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-6 shadow-elevation transition-all duration-200">
              Gerar Plano com IA
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          }
        />
      </Card>
    )
  }

  const cols = [
    {
      id: 'a_fazer' as const,
      title: 'A Fazer',
      color: 'bg-slate-100/60 dark:bg-slate-800/50',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
    },
    {
      id: 'em_progresso' as const,
      title: 'Em Progresso',
      color: 'bg-amber-50/60 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-400',
    },
    {
      id: 'concluido' as const,
      title: 'Concluído',
      color: 'bg-emerald-50/60 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-400',
    },
  ]

  const ColumnContent = ({ status, color, border, title, text }: any) => {
    const isDragOver = dragOverCol === status
    return (
      <div
        className={cn(
          'rounded-xl p-4 min-h-[500px] flex flex-col gap-3 border-2 transition-all duration-200',
          isDragOver
            ? 'border-dashed border-indigo-400 bg-indigo-50/50 scale-[1.01]'
            : `border-solid ${border} ${color}`,
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOverCol(status)
        }}
        onDragLeave={() => setDragOverCol(null)}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="flex items-center gap-2 mb-2 px-1">
          <h3 className={cn('font-bold', text)}>{title}</h3>
          <span className="ml-auto bg-white/60 dark:bg-slate-800 px-2 text-xs font-semibold rounded-full text-slate-500 dark:text-slate-400">
            {etapas.filter((e) => e.status === status).length}
          </span>
        </div>

        {etapas
          .filter((e) => e.status === status)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map((etapa) => (
            <KanbanCard
              key={etapa.id}
              etapa={etapa}
              onDragStart={handleDragStart}
              onMove={handleMove}
              onClick={() => setSelectedEtapa(etapa)}
            />
          ))}
      </div>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900/20 p-4 md:p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Plano de Execução</h2>
      </div>

      <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
        {cols.map((c) => (
          <div key={c.id} className="min-w-[85vw] sm:min-w-[320px] md:min-w-0 snap-center shrink-0">
            <ColumnContent {...c} />
          </div>
        ))}
      </div>

      {selectedEtapa && (
        <ExecutionDrawer
          etapa={selectedEtapa}
          clientUserId={client.user_id}
          open={!!selectedEtapa}
          onOpenChange={(open) => !open && setSelectedEtapa(null)}
          onSaved={onUpdate}
        />
      )}
    </div>
  )
}

function KanbanCard({
  etapa,
  onDragStart,
  onMove,
  onClick,
}: {
  etapa: Etapa
  onDragStart: (e: React.DragEvent, id: string) => void
  onMove: (id: string, status: Etapa['status']) => void
  onClick: (etapa: Etapa) => void
}) {
  const themeClasses = {
    a_fazer:
      'bg-white border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200',
    em_progresso:
      'bg-amber-50/80 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
    concluido:
      'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-100',
  }

  const StatusIcon =
    {
      a_fazer: Circle,
      em_progresso: Loader2,
      concluido: CheckCircle2,
    }[etapa.status] || Circle

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, etapa.id)}
      onClick={() => onClick(etapa)}
      className={cn(
        'p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-[1.02] transition-all duration-200 relative overflow-hidden group',
        themeClasses[etapa.status],
      )}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-start gap-2">
          <StatusIcon
            className={cn(
              'w-4 h-4 mt-0.5 shrink-0 transition-all duration-200',
              etapa.status === 'a_fazer' && 'text-slate-400',
              etapa.status === 'em_progresso' && 'text-amber-500 animate-spin',
              etapa.status === 'concluido' && 'text-emerald-500',
            )}
          />
          <h4 className="font-semibold text-sm leading-snug">{etapa.titulo}</h4>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 -mt-1 -mr-2 opacity-50 hover:opacity-100 flex-shrink-0 transition-opacity duration-200"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
      <p
        className={cn(
          'text-xs mb-4 line-clamp-2 ml-6',
          etapa.status === 'a_fazer'
            ? 'text-slate-500 dark:text-slate-400'
            : etapa.status === 'em_progresso'
              ? 'text-amber-700/80 dark:text-amber-200/70'
              : 'text-emerald-700/80 dark:text-emerald-200/70',
        )}
        title={etapa.descricao}
      >
        {etapa.descricao}
      </p>
      <div className="flex items-center justify-between mt-auto ml-6">
        <span
          className={cn(
            'flex items-center gap-1 border px-2 py-1 rounded-md text-[10px] font-medium transition-colors duration-200',
            etapa.status === 'a_fazer'
              ? 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
              : etapa.status === 'em_progresso'
                ? 'bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:border-amber-800 dark:text-amber-300'
                : 'bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-800 dark:text-emerald-300',
          )}
        >
          <Clock className="w-3 h-3" /> {etapa.tempo_estimado || 'N/D'}
        </span>
      </div>
    </Card>
  )
}
