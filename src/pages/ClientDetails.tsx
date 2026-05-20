import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCliente, Cliente } from '@/services/clients'
import { getPlanos, Plano, updatePlano } from '@/services/planos'
import { getEtapas, Etapa } from '@/services/etapas'
import { getCardsExecucao, CardExecucao } from '@/services/cards_execucao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Target, BookOpen, Edit, Map, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { updateEtapa } from '@/services/etapas'
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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Cliente | null>(null)
  const [plano, setPlano] = useState<Plano | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [cards, setCards] = useState<CardExecucao[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEtapa, setSelectedEtapa] = useState<Etapa | null>(null)
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null)
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null)

  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || (client && user?.id === client.user_id)

  const isDeletedRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!id || isDeletedRef.current) return
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

      try {
        const { default: pb } = await import('@/lib/pocketbase/client')
        const hist = await pb
          .collection('historico_acoes')
          .getFullList({ filter: `registro_id = "${id}" && tabela = "clientes"`, sort: '-created' })
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
          toast.error('Este cliente foi removido.')
          navigate('/')
        }
        return
      }
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime('etapas', () => fetchData())
  useRealtime('planos', () => fetchData())
  useRealtime('clientes', (e) => {
    if (e.action === 'delete' && e.record.id === id) {
      if (!isDeletedRef.current) {
        isDeletedRef.current = true
        toast.error('Este cliente foi removido.')
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
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <CardTitle className="text-md line-clamp-2 pr-2">{etapa.titulo}</CardTitle>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-2 text-slate-400 hover:text-indigo-600 shrink-0"
                        onClick={() => setEditingEtapa(etapa)}
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
                    <Button
                      variant={etapa.status === 'concluido' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => {
                        setSelectedEtapa(etapa)
                        setDrawerOpen(true)
                      }}
                    >
                      {etapa.status === 'concluido' ? 'Ver Execução' : 'Concluir / Log de Execução'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
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
