import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCliente, Cliente, updateCliente } from '@/services/clients'
import { getPlanos, Plano, updatePlano } from '@/services/planos'
import { getEtapas, Etapa } from '@/services/etapas'
import { getCardsExecucao, CardExecucao } from '@/services/cards_execucao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Target, BookOpen, Edit, Map, Loader2, GripVertical, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { updateEtapa } from '@/services/etapas'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useRealtime } from '@/hooks/use-realtime'
import { ClientHeader } from '@/components/ClientHeader'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ProgressMap } from '@/components/ProgressMap'
import { Confetti } from '@/components/Confetti'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { ExecutionDrawer } from '@/components/ExecutionDrawer'

export default function ClientDetails() {
  const { email } = useParams<{ email: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Cliente | null>(null)
  const [plano, setPlano] = useState<Plano | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [localEtapas, setLocalEtapas] = useState<Etapa[]>([])
  const [cards, setCards] = useState<CardExecucao[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const dragItem = useRef<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEtapa, setSelectedEtapa] = useState<Etapa | null>(null)
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null)
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null)

  const [editingInsights, setEditingInsights] = useState(false)
  const [insightData, setInsightData] = useState({ objetivo_principal: '', contexto: '' })

  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isClient = !isAdmin
  const canEdit = isAdmin || (client && user?.id === client.user_id)

  const firstUncompletedOrdem =
    localEtapas
      .filter((e) => e.status !== 'concluido')
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))[0]?.ordem ?? Infinity

  const visibleEtapas = isAdmin
    ? localEtapas
    : localEtapas.filter((e) => (e.ordem || 0) <= firstUncompletedOrdem)

  const isDeletedRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!email || isDeletedRef.current) return
    try {
      const { getClienteByEmail } = await import('@/services/clients')
      const c = await getClienteByEmail(email)
      setClient(c)
      setInsightData({
        objetivo_principal: c.objetivo_principal || '',
        contexto: c.contexto || '',
      })
      if (
        !c.objetivo_principal &&
        !c.contexto &&
        (!c.user_id || user?.id === c.user_id || user?.role === 'admin')
      ) {
        setEditingInsights(true)
      }

      const ps = await getPlanos(c.id)
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

      try {
        const { default: pb } = await import('@/lib/pocketbase/client')
        const hist = await pb.collection('historico_acoes').getFullList({
          filter: `registro_id = "${c.id}" && tabela = "clientes"`,
          sort: '-created',
        })
        const errLog = hist.find((h: any) => h.dados_depois?.error)
        if (errLog) {
          let errorMsg = errLog.dados_depois.error
          if (
            typeof errorMsg === 'string' &&
            errorMsg.includes('kickoff_transcript') &&
            errorMsg.includes('Must be no more than')
          ) {
            errorMsg =
              'O transcrito da reunião é muito longo e excede o limite de 100.000 caracteres. Por favor, tente com uma reunião mais curta.'
          }
          setGenerationError(errorMsg)
          setIsGenerating(false)
        } else if (c.tldv_meeting_id && ps.length === 0) {
          setIsGenerating(true)
          setGenerationError(null)
        } else {
          setIsGenerating(false)
          setGenerationError(null)
        }
      } catch (err) {
        // fail silently for history
      }
    } catch (err: any) {
      if (err?.status === 404) {
        if (!isDeletedRef.current) {
          isDeletedRef.current = true
          if (user?.role === 'admin') {
            toast.error('Este cliente foi removido.')
          }
          navigate('/')
        }
        return
      }
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [email, navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (dragItem.current === null) {
      setLocalEtapas([...etapas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)))
    }
  }, [etapas])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!canEdit) return
    dragItem.current = index
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => setDraggedIndex(index), 0)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (!canEdit || dragItem.current === null) return

    if (dragItem.current !== index) {
      setLocalEtapas((prev) => {
        const newList = [...prev]
        const dragged = newList[dragItem.current!]
        newList.splice(dragItem.current!, 1)
        newList.splice(index, 0, dragged)
        dragItem.current = index
        setDraggedIndex(index)
        return newList
      })
    }
  }

  const saveInsights = async () => {
    if (!client) return
    try {
      await updateCliente(client.id, insightData)
      toast.success('Mapeamento atualizado com sucesso!')
      setEditingInsights(false)
      fetchData()
    } catch (err) {
      toast.error('Erro ao atualizar mapeamento.')
    }
  }

  const handleDragEnd = async () => {
    if (!canEdit) return
    const currentLocal = [...localEtapas]
    dragItem.current = null
    setDraggedIndex(null)

    const promises = currentLocal.map((etapa, index) => {
      const newOrder = index + 1
      if (etapa.ordem !== newOrder) {
        return updateEtapa(etapa.id, { ordem: newOrder })
      }
      return Promise.resolve()
    })

    try {
      await Promise.all(promises)
    } catch (err) {
      toast.error('Erro ao reordenar etapas')
      fetchData()
    }
  }

  useRealtime('etapas', () => fetchData())
  useRealtime('planos', () => fetchData())
  useRealtime('clientes', (e) => {
    if (e.action === 'delete' && client && e.record.id === client.id) {
      if (!isDeletedRef.current) {
        isDeletedRef.current = true
        if (user?.role === 'admin') {
          toast.error('Este cliente foi removido.')
        }
        navigate('/')
      }
      return
    }
    fetchData()
  })
  useRealtime('cards_execucao', () => fetchData())
  useRealtime('historico_acoes', () => fetchData())

  if (loading && !client) return <LoadingState />
  if (error || !client) return <ErrorState onBack={() => navigate('/')} />

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {isGenerating && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 flex flex-col items-center justify-center text-center mb-6">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
            Gerando Estratégia do Cliente...
          </h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-2 max-w-md mx-auto">
            A Inteligência Artificial está analisando o transcrito da reunião, estruturando o plano
            de sucesso e criando todas as etapas e tarefas para você. Isso pode levar alguns
            minutos.
          </p>
        </div>
      )}

      {generationError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 flex flex-col items-center justify-center text-center mb-6">
          <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
            Falha ao Gerar Estratégia
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-2 max-w-md mx-auto">
            {generationError}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => fetchData()}>
            Tentar Novamente (Recarregar)
          </Button>
        </div>
      )}
      <Confetti active={showConfetti} />
      {user?.role === 'admin' && (
        <div className="flex justify-between items-center -ml-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      )}

      <ClientHeader
        client={client}
        plano={plano}
        etapas={localEtapas}
        onUpdate={fetchData}
        onConfetti={() => {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }}
      />

      {plano && (
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-dashed relative group overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between relative z-10">
            <CardTitle className="text-xl flex items-center gap-2 text-indigo-900 dark:text-indigo-100 font-extrabold">
              <Map className="w-6 h-6 text-indigo-500" /> Plano de Acesso: {plano.titulo}
            </CardTitle>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                onClick={() => setEditingPlano(plano)}
              >
                <Edit className="h-4 w-4 mr-2" /> Editar Plano
              </Button>
            )}
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-slate-700 dark:text-slate-300 text-base mb-4 whitespace-pre-wrap">
              {plano.descricao || 'Nenhuma descrição.'}
            </p>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30 capitalize">
              Status: {plano.status.replace('_', ' ')}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-dashed relative">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <Target className="w-5 h-5 text-indigo-500" /> Objetivo Principal
            </CardTitle>
            {canEdit && !editingInsights && (
              <Button variant="ghost" size="sm" onClick={() => setEditingInsights(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingInsights ? (
              <Input
                value={insightData.objetivo_principal}
                onChange={(e) =>
                  setInsightData({ ...insightData, objetivo_principal: e.target.value })
                }
                placeholder="Qual o seu objetivo principal?"
              />
            ) : (
              <p className="text-slate-700 dark:text-slate-300">
                {client.objetivo_principal || 'Nenhum objetivo definido.'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-dashed relative">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <BookOpen className="w-5 h-5 text-indigo-500" /> Contexto
            </CardTitle>
            {canEdit && !editingInsights && (
              <Button variant="ghost" size="sm" onClick={() => setEditingInsights(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingInsights ? (
              <Textarea
                value={insightData.contexto}
                onChange={(e) => setInsightData({ ...insightData, contexto: e.target.value })}
                placeholder="Descreva o contexto atual..."
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {client.contexto || 'Nenhum contexto definido.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {editingInsights && canEdit && (
        <div className="flex justify-end mb-6">
          <Button onClick={saveInsights}>Salvar Mapeamento</Button>
        </div>
      )}

      {visibleEtapas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 px-1">
            Mapeamento Estratégico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleEtapas.map((etapa, index) => {
              const isLocked = isClient && (etapa.ordem || 0) > firstUncompletedOrdem
              return (
                <Card
                  key={etapa.id}
                  draggable={canEdit && !isLocked}
                  onDragStart={(e) => {
                    if (!isLocked) handleDragStart(e, index)
                  }}
                  onDragOver={(e) => {
                    if (!isLocked) handleDragOver(e, index)
                  }}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md relative',
                    canEdit && !isLocked && 'cursor-grab active:cursor-grabbing',
                    draggedIndex === index &&
                      'opacity-50 scale-95 border-dashed border-2 bg-indigo-50 dark:bg-indigo-900/20',
                    isLocked && 'opacity-60 grayscale-[30%]',
                  )}
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-50/10 backdrop-blur-[1px] z-20 rounded-xl flex flex-col items-center justify-center cursor-not-allowed">
                      <div className="bg-white/90 dark:bg-slate-800/90 p-4 rounded-full shadow-sm text-slate-500 flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6" />
                      </div>
                      <span className="bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                        Bloqueado
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      {canEdit && (
                        <div className="mt-1 text-slate-300 hover:text-slate-500 shrink-0 cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      )}
                      <CardTitle className="text-md line-clamp-2 pr-2">{etapa.titulo}</CardTitle>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-2 text-slate-400 hover:text-indigo-600 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingEtapa(etapa)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
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
                  <CardFooter className="pt-0 pb-4 flex justify-end">
                    {etapa.status === 'aguardando_aprovacao' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 relative z-30"
                        onClick={() => {
                          setSelectedEtapa(etapa)
                          setDrawerOpen(true)
                        }}
                      >
                        {isAdmin ? 'Avaliar Execução' : 'Aguardando Aprovação'}
                      </Button>
                    ) : (
                      <Button
                        variant={etapa.status === 'concluido' ? 'outline' : 'default'}
                        size="sm"
                        className="relative z-30"
                        disabled={isLocked && !isAdmin}
                        onClick={() => {
                          setSelectedEtapa(etapa)
                          setDrawerOpen(true)
                        }}
                      >
                        {etapa.status === 'concluido' ? 'Ver Execução' : 'Executar Tarefa'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {selectedEtapa && (
        <ExecutionDrawer
          etapa={selectedEtapa}
          clientUserId={client.user_id}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onSaved={fetchData}
        />
      )}

      <ProgressMap plano={plano} etapas={visibleEtapas} />

      <KanbanBoard
        client={client}
        plano={plano}
        etapas={visibleEtapas}
        cards={cards}
        onUpdate={fetchData}
        onConfetti={() => {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }}
      />

      <Dialog open={!!editingPlano} onOpenChange={(open) => !open && setEditingPlano(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano de Sucesso</DialogTitle>
          </DialogHeader>
          {editingPlano && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                try {
                  await updatePlano(editingPlano.id, {
                    titulo: formData.get('titulo') as string,
                    descricao: formData.get('descricao') as string,
                    status: formData.get('status') as Plano['status'],
                  })
                  toast.success('Plano atualizado com sucesso!')
                  setEditingPlano(null)
                  fetchData()
                } catch (err: any) {
                  const fieldErrors = extractFieldErrors(err)
                  const firstError = Object.entries(fieldErrors)[0]
                  if (firstError) {
                    toast.error(`Erro no campo ${firstError[0]}: ${firstError[1]}`)
                  } else {
                    toast.error(err.message || 'Erro ao atualizar plano.')
                  }
                }
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input name="titulo" defaultValue={editingPlano.titulo} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    name="descricao"
                    defaultValue={editingPlano.descricao}
                    className="min-h-[100px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    name="status"
                    defaultValue={editingPlano.status}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEtapa} onOpenChange={(open) => !open && setEditingEtapa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          {editingEtapa && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                try {
                  await updateEtapa(editingEtapa.id, {
                    titulo: formData.get('titulo') as string,
                    descricao: formData.get('descricao') as string,
                    objetivo: formData.get('objetivo') as string,
                    tempo_estimado: formData.get('tempo_estimado') as string,
                    status: formData.get('status') as Etapa['status'],
                  })
                  toast.success('Etapa atualizada com sucesso!')
                  setEditingEtapa(null)
                  fetchData()
                } catch (err: any) {
                  const fieldErrors = extractFieldErrors(err)
                  const firstError = Object.entries(fieldErrors)[0]
                  if (firstError) {
                    toast.error(`Erro no campo ${firstError[0]}: ${firstError[1]}`)
                  } else {
                    toast.error(err.message || 'Erro ao atualizar etapa.')
                  }
                }
              }}
            >
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input name="titulo" defaultValue={editingEtapa.titulo} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea name="descricao" defaultValue={editingEtapa.descricao} required />
                </div>
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Input name="objetivo" defaultValue={editingEtapa.objetivo} />
                </div>
                <div className="space-y-2">
                  <Label>Tempo Estimado</Label>
                  <Input name="tempo_estimado" defaultValue={editingEtapa.tempo_estimado} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    name="status"
                    defaultValue={editingEtapa.status}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="a_fazer">A Fazer</option>
                    <option value="em_progresso">Em Progresso</option>
                    <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
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
