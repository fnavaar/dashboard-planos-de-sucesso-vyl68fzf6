import { useState, useRef, useEffect } from 'react'
import { Cliente } from '@/services/clients'
import { Plano } from '@/services/planos'
import { Etapa, updateEtapaStatus } from '@/services/etapas'
import {
  CardExecucao,
  updateCardExecucao,
  createCardExecucao,
  deleteCardExecucao,
} from '@/services/cards_execucao'
import { GeneratePlanDialog } from '@/components/GeneratePlanDialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUsers, User as AppUser } from '@/services/users'
import {
  Sparkles,
  Plus,
  Loader2,
  Calendar,
  User,
  AlignLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface Props {
  client: Cliente
  plano: Plano | null
  etapas: Etapa[]
  cards: CardExecucao[]
  onUpdate: () => void
  onConfetti: () => void
  readOnly?: boolean
}

export function KanbanBoard({
  client,
  plano,
  etapas,
  cards,
  onUpdate,
  onConfetti,
  readOnly,
}: Props) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [usersList, setUsersList] = useState<AppUser[]>([])

  useEffect(() => {
    getUsers()
      .then(setUsersList)
      .catch(() => {})
  }, [])
  const [editingCard, setEditingCard] = useState<CardExecucao | null>(null)
  const [addingToEtapa, setAddingToEtapa] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 360
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDrop = async (e: React.DragEvent, etapaId: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return

    const card = cards.find((c) => c.id === id)
    if (card && card.etapa_id !== etapaId) {
      try {
        await updateCardExecucao(id, { etapa_id: etapaId })
        onUpdate()
      } catch (err) {
        toast.error(getErrorMessage(err) || 'Erro ao mover a tarefa')
      }
    }
  }

  const handleToggleCard = async (card: CardExecucao, completed: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await updateCardExecucao(card.id, { quando_foi_executado: completed ? today : '' })
      onUpdate()
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Erro ao atualizar tarefa')
    }
  }

  const handleCompleteEtapa = async (etapaId: string) => {
    try {
      await updateEtapaStatus(etapaId, 'concluido')
      onConfetti()
      onUpdate()
      toast.success('Fase concluída!')
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Erro ao concluir fase')
    }
  }

  if (!plano) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center bg-indigo-50/50 dark:bg-indigo-950/20 border-dashed border-2 border-indigo-200 dark:border-indigo-900 transition-all duration-200">
        <Sparkles className="w-12 h-12 text-indigo-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">
          {readOnly ? 'Plano não encontrado' : 'Nenhum plano criado ainda'}
        </h3>
        <p className="text-slate-500 mb-6 max-w-md">
          {readOnly
            ? 'Seu plano ainda não foi criado. Aguarde contato da Adapta.'
            : 'Utilize nossa IA para gerar um plano de sucesso gamificado e personalizado baseado nos objetivos do cliente.'}
        </p>
        {!readOnly && (
          <GeneratePlanDialog
            client={client}
            onSuccess={() => {
              onUpdate()
              onConfetti()
            }}
            trigger={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-6 shadow-elevation transition-all duration-200 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:font-bold">
                Gerar Plano com IA
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            }
          />
        )}
      </Card>
    )
  }

  const sortedEtapas = [...etapas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  return (
    <div className="bg-slate-50 dark:bg-slate-900/20 p-4 md:p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Jornada de Execução</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-8 w-8 rounded-full dark:border-secondary dark:text-secondary dark:hover:bg-secondary/20 transition-all hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-8 w-8 rounded-full dark:border-secondary dark:text-secondary dark:hover:bg-secondary/20 transition-all hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scroll-smooth kanban-scroll"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {sortedEtapas.map((etapa) => {
          const isDragOver = dragOverCol === etapa.id
          const colCards = cards.filter((c) => c.etapa_id === etapa.id)
          const completedCards = colCards.filter((c) => !!c.quando_foi_executado)
          const isAllCompleted = colCards.length === 0 || completedCards.length === colCards.length
          const isEtapaConcluida = etapa.status === 'concluido'

          return (
            <div
              key={etapa.id}
              id={`kanban-col-${etapa.id}`}
              className="min-w-[85vw] sm:min-w-[320px] md:min-w-[340px] snap-center shrink-0"
            >
              <div
                className={cn(
                  'rounded-xl p-4 min-h-[500px] flex flex-col gap-3 border-2 transition-all duration-200',
                  isDragOver
                    ? 'border-dashed border-indigo-400 bg-indigo-50/50 scale-[1.01]'
                    : isEtapaConcluida
                      ? 'border-solid border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-900/10'
                      : 'border-solid border-slate-200 bg-slate-100/60 dark:border-slate-700 dark:bg-slate-800/50',
                )}
                onDragOver={
                  readOnly
                    ? undefined
                    : (e) => {
                        e.preventDefault()
                        setDragOverCol(etapa.id)
                      }
                }
                onDragLeave={readOnly ? undefined : () => setDragOverCol(null)}
                onDrop={readOnly ? undefined : (e) => handleDrop(e, etapa.id)}
              >
                <div className="flex flex-col gap-1 mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className="font-bold text-slate-700 dark:text-slate-300 line-clamp-1"
                      title={etapa.titulo}
                    >
                      {etapa.titulo}
                    </h3>
                    <span className="ml-2 bg-white/60 dark:bg-slate-800 dark:text-secondary px-2 py-0.5 text-xs font-semibold rounded-full text-slate-500 shrink-0">
                      {completedCards.length}/{colCards.length}
                    </span>
                  </div>
                  {isEtapaConcluida && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Fase Concluída
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
                  {colCards.map((card) => (
                    <TaskCard
                      key={card.id}
                      card={card}
                      onDragStart={handleDragStart}
                      onEdit={() => setEditingCard(card)}
                      onToggle={(completed) => handleToggleCard(card, completed)}
                      readOnly={readOnly}
                    />
                  ))}

                  {!isEtapaConcluida && !readOnly && (
                    <Button
                      variant="ghost"
                      onClick={() => setAddingToEtapa(etapa.id)}
                      className="w-full mt-2 border border-dashed border-slate-300 dark:border-secondary dark:text-secondary hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-secondary/20 dark:hover:text-secondary-foreground shrink-0 transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
                    </Button>
                  )}
                </div>

                {!isEtapaConcluida && isAllCompleted && !readOnly && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-fade-in-up shrink-0">
                    <Button
                      onClick={() => handleCompleteEtapa(etapa.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md group transition-all dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:font-bold"
                    >
                      Concluir Fase
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <TaskDialog
        card={editingCard}
        etapaId={addingToEtapa}
        open={!!editingCard || !!addingToEtapa}
        onClose={() => {
          setEditingCard(null)
          setAddingToEtapa(null)
        }}
        onSave={() => {
          setEditingCard(null)
          setAddingToEtapa(null)
          onUpdate()
        }}
        readOnly={readOnly}
        usersList={usersList}
      />
    </div>
  )
}

function TaskCard({
  card,
  onDragStart,
  onEdit,
  onToggle,
  readOnly,
}: {
  card: CardExecucao
  onDragStart: (e: React.DragEvent, id: string) => void
  onEdit: () => void
  onToggle: (completed: boolean) => void
  readOnly?: boolean
}) {
  const isCompleted = !!card.quando_foi_executado

  return (
    <Card
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : (e) => onDragStart(e, card.id)}
      className={cn(
        'p-3 hover:shadow-md transition-all duration-200 relative overflow-hidden group shrink-0',
        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isCompleted
          ? 'bg-slate-50 border-slate-200/50 opacity-75 dark:bg-slate-900/50 dark:border-slate-800'
          : 'bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-700',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(c) => onToggle(c as boolean)}
            disabled={readOnly}
            className={cn(
              isCompleted &&
                'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500',
            )}
          />
        </div>
        <div className="flex-1 cursor-pointer min-w-0" onClick={onEdit}>
          <p
            className={cn(
              'text-sm font-medium line-clamp-2 break-words leading-tight',
              isCompleted && 'line-through text-slate-400 dark:text-slate-500',
              !isCompleted && 'text-slate-800 dark:text-slate-200',
            )}
          >
            {card.o_que_foi_feito || 'Tarefa sem título'}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {card.responsavel && (
              <span className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                <User className="w-3 h-3 mr-1" /> {card.responsavel}
              </span>
            )}
            {card.passos_seguidos && (
              <span className="flex items-center text-[10px] text-slate-500 dark:text-slate-400">
                <AlignLeft className="w-3 h-3 mr-1" /> Detalhes
              </span>
            )}
            {card.quando_foi_executado && (
              <span className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-3 h-3 mr-1" />{' '}
                {new Date(card.quando_foi_executado).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function TaskDialog({
  card,
  etapaId,
  open,
  onClose,
  onSave,
  readOnly,
  usersList,
}: {
  card: CardExecucao | null
  etapaId: string | null
  open: boolean
  onClose: () => void
  onSave: () => void
  readOnly?: boolean
  usersList: AppUser[]
}) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!card

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const data = {
      o_que_foi_feito: formData.get('o_que_foi_feito') as string,
      passos_seguidos: formData.get('passos_seguidos') as string,
      como_foi_executado: formData.get('como_foi_executado') as string,
      responsavel: formData.get('responsavel') as string,
    }

    try {
      if (isEditing && card) {
        await updateCardExecucao(card.id, data)
        toast.success('Tarefa atualizada')
      } else if (etapaId) {
        await createCardExecucao({ ...data, etapa_id: etapaId })
        toast.success('Tarefa criada')
      }
      onSave()
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Erro ao salvar tarefa')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!card) return
    if (!confirm('Deseja realmente excluir esta tarefa?')) return
    setLoading(true)
    try {
      await deleteCardExecucao(card.id)
      toast.success('Tarefa excluída')
      onSave()
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Erro ao excluir tarefa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {readOnly ? 'Detalhes da Tarefa' : isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="o_que_foi_feito">O que foi feito?</Label>
              <Input
                id="o_que_foi_feito"
                name="o_que_foi_feito"
                defaultValue={card?.o_que_foi_feito || ''}
                placeholder="Ex: Enviar e-mail de boas vindas"
                required
                autoFocus={!readOnly}
                readOnly={readOnly}
                className={
                  readOnly ? 'bg-slate-50 dark:bg-slate-900 border-none pointer-events-none' : ''
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              {readOnly ? (
                <Input
                  id="responsavel"
                  name="responsavel"
                  defaultValue={card?.responsavel || ''}
                  placeholder="Sem responsável"
                  readOnly={readOnly}
                  className="bg-slate-50 dark:bg-slate-900 border-none pointer-events-none"
                />
              ) : (
                <Select name="responsavel" defaultValue={card?.responsavel || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map((u) => {
                      const identifier = u.name || u.email
                      return (
                        <SelectItem key={u.id} value={identifier}>
                          {identifier}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="como_foi_executado">Como foi executado?</Label>
              <Textarea
                id="como_foi_executado"
                name="como_foi_executado"
                defaultValue={card?.como_foi_executado || ''}
                rows={3}
                placeholder="Detalhes sobre a execução..."
                readOnly={readOnly}
                className={
                  readOnly
                    ? 'bg-slate-50 dark:bg-slate-900 border-none pointer-events-none resize-none'
                    : ''
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passos_seguidos">Passos Seguidos</Label>
              <Textarea
                id="passos_seguidos"
                name="passos_seguidos"
                defaultValue={card?.passos_seguidos || ''}
                rows={4}
                placeholder="Descreva o que precisa ser feito..."
                readOnly={readOnly}
                className={
                  readOnly
                    ? 'bg-slate-50 dark:bg-slate-900 border-none pointer-events-none resize-none'
                    : ''
                }
              />
            </div>
            {readOnly && card?.quando_foi_executado && (
              <div className="space-y-2">
                <Label>Data de Execução</Label>
                <div className="text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  {new Date(card.quando_foi_executado).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
          </div>
          {!readOnly && (
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              {isEditing ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </Button>
              ) : (
                <div />
              )}
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          )}
          {readOnly && (
            <DialogFooter>
              <Button type="button" onClick={onClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
