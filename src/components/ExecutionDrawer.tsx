import { useEffect, useState, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Bot,
  Loader2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/use-auth'
import { Etapa, updateEtapaStatus } from '@/services/etapas'
import {
  getCardExecucaoByEtapa,
  createCardExecucao,
  updateCardExecucao,
  CardExecucao,
} from '@/services/cards_execucao'
import { getUsers, User } from '@/services/users'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  etapa: Etapa
  clientUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const formSchema = z.object({
  o_que_foi_feito: z.string().optional(),
  passos_seguidos: z.string().optional(),
  como_foi_executado: z.string().optional(),
  quando_foi_executado: z.date().optional(),
  responsavel: z.string().optional(),
  anexos: z
    .array(z.object({ url: z.string().url('URL inválida').or(z.string().length(0)) }))
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

export function ExecutionDrawer({ etapa, clientUserId, open, onOpenChange, onSaved }: Props) {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canEdit = user?.id === clientUserId || isAdmin

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [record, setRecord] = useState<CardExecucao | null>(null)
  const [usersList, setUsersList] = useState<User[]>([])

  const [submitAction, setSubmitAction] = useState<'save' | 'review' | 'approve' | 'adjust'>('save')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      o_que_foi_feito: '',
      passos_seguidos: '',
      como_foi_executado: '',
      responsavel: '',
      anexos: [{ url: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'anexos',
  })

  const [tldvModalOpen, setTldvModalOpen] = useState(false)
  const [tldvMeetingId, setTldvMeetingId] = useState('')
  const [importingTldv, setImportingTldv] = useState(false)
  const [hasTldvImport, setHasTldvImport] = useState(false)
  const [tldvError, setTldvError] = useState<string | null>(null)

  const [newFiles, setNewFiles] = useState<File[]>([])
  const [deletedFiles, setDeletedFiles] = useState<string[]>([])

  const handleImportTldv = async () => {
    if (!tldvMeetingId.trim()) return

    const match = tldvMeetingId.match(/tldv\.io\/app\/meetings\/([a-zA-Z0-9_-]+)/)
    const parsedId = match ? match[1] : tldvMeetingId.trim()

    if (!parsedId) {
      setTldvError(
        'Reunião não encontrada. Verifique se o link/ID está correto e se a reunião foi compartilhada na sua conta TLDV.',
      )
      return
    }

    setImportingTldv(true)
    setTldvError(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await pb.send('/backend/v1/fetch-tldv-transcript', {
        method: 'POST',
        body: JSON.stringify({
          etapa_id: etapa.id,
          tldv_meeting_id: parsedId,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const createdCount = res?.createdCount || 0

      setTldvModalOpen(false)
      toast.success(`Mapeamento concluído: ${createdCount} novas tarefas adicionadas à jornada`, {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      })
      form.reset()
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.status === 404) {
        setTldvError(
          'Reunião não encontrada. Verifique se o link/ID está correto e se a reunião foi compartilhada na sua conta TLDV.',
        )
      } else if (err.status === 401) {
        setTldvError(
          'Erro de autenticação com TLDV. Verifique se a chave da API está configurada corretamente nos secrets do Skip Cloud.',
        )
      } else {
        setTldvError('Erro ao carregar transcrição. Verifique o ID da reunião ou tente novamente.')
      }
    } finally {
      setImportingTldv(false)
    }
  }

  const fetchData = async () => {
    if (!open) return
    setLoading(true)
    setError(false)
    setNewFiles([])
    setDeletedFiles([])
    try {
      const [uList, card] = await Promise.all([getUsers(), getCardExecucaoByEtapa(etapa.id)])
      setUsersList(uList)
      setRecord(card)

      if (card) {
        const defAnexos =
          card.anexos && card.anexos.length > 0
            ? card.anexos.map((url) => ({ url }))
            : [{ url: '' }]

        form.reset({
          o_que_foi_feito: card.o_que_foi_feito || '',
          passos_seguidos: card.passos_seguidos || '',
          como_foi_executado: card.como_foi_executado || '',
          quando_foi_executado: card.quando_foi_executado
            ? new Date(card.quando_foi_executado)
            : undefined,
          responsavel: card.responsavel || '',
          anexos: defAnexos,
        })
      } else {
        form.reset()
      }
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa.id, open])

  const [isDirty, setIsDirty] = useState(false)
  const watched = form.watch()

  const hasEvidence =
    !!watched.o_que_foi_feito?.trim() ||
    !!(watched.anexos && watched.anexos.some((a) => a.url?.trim() !== '')) ||
    newFiles.length > 0 ||
    (record?.arquivos_evidencia && record.arquivos_evidencia.length - deletedFiles.length > 0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter((f) => f.size <= 5242880) // 5MB
      if (validFiles.length < files.length) {
        toast.error('Alguns arquivos excedem o limite de 5MB e foram ignorados.')
      }
      setNewFiles((prev) => [...prev, ...validFiles])
    }
    e.target.value = ''
  }

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingFile = (filename: string) => {
    setDeletedFiles((prev) => [...prev, filename])
  }

  const getFileUrl = (filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/cards_execucao/${record?.id}/${filename}`
  }

  const defaultValuesStr = useMemo(() => {
    const defAnexos =
      record?.anexos && record.anexos.length > 0
        ? record.anexos.map((url) => ({ url }))
        : [{ url: '' }]
    return JSON.stringify({
      o_que_foi_feito: record?.o_que_foi_feito || '',
      passos_seguidos: record?.passos_seguidos || '',
      como_foi_executado: record?.como_foi_executado || '',
      quando_foi_executado: record?.quando_foi_executado
        ? new Date(record.quando_foi_executado).toISOString()
        : undefined,
      responsavel: record?.responsavel || '',
      anexos: defAnexos,
    })
  }, [record])

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentStr = JSON.stringify({
        ...watched,
        quando_foi_executado: watched.quando_foi_executado?.toISOString(),
      })
      setIsDirty(currentStr !== defaultValuesStr)
    }, 300)
    return () => clearTimeout(timer)
  }, [watched, defaultValuesStr])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      if (!window.confirm('Existem alterações não salvas. Deseja realmente sair?')) return
    }
    onOpenChange(newOpen)
  }

  const onSubmit = async (data: FormValues) => {
    if (!canEdit) return
    setSaving(true)
    setSaveError(false)
    try {
      const payload = new FormData()
      payload.append('etapa_id', etapa.id)
      if (data.o_que_foi_feito) payload.append('o_que_foi_feito', data.o_que_foi_feito)
      if (data.passos_seguidos) payload.append('passos_seguidos', data.passos_seguidos)
      if (data.como_foi_executado) payload.append('como_foi_executado', data.como_foi_executado)
      if (data.quando_foi_executado)
        payload.append('quando_foi_executado', data.quando_foi_executado.toISOString())
      if (data.responsavel) payload.append('responsavel', data.responsavel)

      const validAnexos = data.anexos
        ? data.anexos.map((a) => a.url).filter((u) => u.trim() !== '')
        : []
      payload.append('anexos', JSON.stringify(validAnexos))

      newFiles.forEach((f) => payload.append('arquivos_evidencia', f))
      deletedFiles.forEach((f) => payload.append('arquivos_evidencia-', f))

      let savedRecord: CardExecucao
      if (record?.id) {
        savedRecord = await updateCardExecucao(record.id, payload)
      } else {
        savedRecord = await createCardExecucao(payload)
      }

      if (hasTldvImport && user?.id) {
        try {
          await pb.collection('historico_acoes').create({
            user_id: user.id,
            tabela: 'cards_execucao',
            registro_id: savedRecord.id,
            acao: record?.id ? 'update' : 'create',
            dados_antes: record || {},
            dados_depois: { ...savedRecord, source: 'Sincronização TLDV', note: 'TLDV Import' },
          })
        } catch (err) {
          console.error('Erro ao salvar histórico do TLDV:', err)
        }
      }

      let newStatus = etapa.status
      if (submitAction === 'review') newStatus = 'aguardando_aprovacao'
      else if (submitAction === 'approve') newStatus = 'concluido'
      else if (submitAction === 'adjust') newStatus = 'em_progresso'
      else if (submitAction === 'save' && etapa.status === 'a_fazer') newStatus = 'em_progresso'

      if (newStatus !== etapa.status) {
        await updateEtapaStatus(etapa.id, newStatus as any, etapa)
      }

      toast.success('Dados salvos com sucesso!', {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setSaveError(true)
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const renderContent = () => {
    if (error) {
      return (
        <div className="p-6 text-center flex-1 flex flex-col justify-center items-center">
          <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
          <p className="text-slate-600 mb-4">Erro ao carregar dados. Tente novamente.</p>
          <Button onClick={fetchData}>Tentar Novamente</Button>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="p-6 space-y-6 flex-1 overflow-hidden pt-20">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )
    }

    const isEmpty = !record

    return (
      <div className="flex flex-col h-full absolute inset-0 pt-16">
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          {isEmpty && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-lg mb-6 text-sm border border-amber-200 dark:border-amber-800/50">
              Nenhum dado preenchido ainda. Complete os campos abaixo para iniciar.
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg mb-6 text-sm flex items-center justify-between border border-red-200 dark:border-red-800/50">
              <span>Erro ao salvar. Tente novamente.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSubmit(form.getValues())}
                disabled={saving}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm font-semibold mb-1 text-slate-500">Objetivo da etapa</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-sm text-slate-700 dark:text-slate-300">
              {etapa.objetivo || 'Sem objetivo definido.'}
            </div>
          </div>

          <Form {...form}>
            <form id="execution-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="o_que_foi_feito"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel className="mb-0 flex items-center gap-2">
                        O que foi feito?
                        {hasTldvImport && (
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30">
                            Importado via TLDV
                          </span>
                        )}
                      </FormLabel>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTldvModalOpen(true)}
                          className="h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950"
                        >
                          <Bot className="w-3.5 h-3.5 mr-1.5" />
                          Carregar do TLDV
                        </Button>
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o que foi realizado..."
                        className="resize-none min-h-[100px]"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passos_seguidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passos seguidos</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="1. Primeiro passo...&#10;2. Segundo passo..."
                        className="resize-none min-h-[100px]"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="como_foi_executado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Como foi executado?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes da execução, ferramentas utilizadas..."
                        className="resize-none min-h-[100px]"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="quando_foi_executado"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2">Quando foi executado?</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              disabled={!canEdit}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <Select
                        disabled={!canEdit}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um usuário" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <Label>Links Úteis</Label>
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`anexos.${index}.url`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="https://..." {...inputField} disabled={!canEdit} />
                          </FormControl>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ url: '' })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Link
                  </Button>
                )}

                <div className="pt-4 border-t mt-6">
                  <Label className="mb-4 block">Arquivos (Documentos e Imagens)</Label>
                  {record?.arquivos_evidencia &&
                    record.arquivos_evidencia
                      .filter((f) => !deletedFiles.includes(f))
                      .map((f) => (
                        <div
                          key={f}
                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm mb-2 border border-slate-200 dark:border-slate-800"
                        >
                          <a
                            href={getFileUrl(f)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline truncate mr-2"
                          >
                            {f}
                          </a>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExistingFile(f)}
                              className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                  {newFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded text-sm mb-2 border border-indigo-100 dark:border-indigo-800/30"
                    >
                      <span className="truncate mr-2 text-indigo-700 dark:text-indigo-300">
                        {f.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNewFile(i)}
                        className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {canEdit && (
                    <div className="mt-4">
                      <Label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                      >
                        <Upload className="w-4 h-4 mr-2" /> Anexar Arquivos
                      </Label>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Imagens e Documentos (Máx 5MB por arquivo)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="border-t p-4 bg-white dark:bg-slate-950 flex flex-wrap justify-end gap-3 shrink-0 absolute bottom-0 left-0 right-0 z-10">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>

          {!isAdmin && etapa.status !== 'concluido' && etapa.status !== 'aguardando_aprovacao' && (
            <>
              <Button
                type="submit"
                form="execution-form"
                variant="secondary"
                onClick={() => setSubmitAction('save')}
                disabled={saving}
              >
                Salvar Rascunho
              </Button>
              <Button
                type="submit"
                form="execution-form"
                onClick={() => setSubmitAction('review')}
                disabled={!hasEvidence || saving}
              >
                {saving && submitAction === 'review' ? 'Enviando...' : 'Enviar para Revisão'}
              </Button>
            </>
          )}

          {isAdmin && etapa.status === 'aguardando_aprovacao' && (
            <>
              <Button
                type="submit"
                form="execution-form"
                variant="outline"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setSubmitAction('adjust')}
                disabled={saving}
              >
                Solicitar Ajustes
              </Button>
              <Button
                type="submit"
                form="execution-form"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setSubmitAction('approve')}
                disabled={saving}
              >
                Aprovar Etapa
              </Button>
            </>
          )}

          {(isAdmin && etapa.status !== 'aguardando_aprovacao') ||
          (!isAdmin &&
            (etapa.status === 'concluido' || etapa.status === 'aguardando_aprovacao')) ? (
            <Button
              type="submit"
              form="execution-form"
              onClick={() => setSubmitAction('save')}
              disabled={!isDirty || saving}
            >
              Salvar Alterações
            </Button>
          ) : null}
        </div>

        <Dialog open={tldvModalOpen} onOpenChange={setTldvModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Importar da Reunião TLDV</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Link ou ID da Reunião TLDV</Label>
                <Input
                  placeholder="Ex: https://tldv.io/app/meetings/abc123 ou apenas o ID"
                  value={tldvMeetingId}
                  onChange={(e) => {
                    setTldvMeetingId(e.target.value)
                    if (tldvError) setTldvError(null)
                  }}
                  disabled={importingTldv}
                  autoFocus
                />
              </div>
              {tldvError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-3 rounded-md text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-red-200 dark:border-red-800/50">
                  <span className="flex-1">{tldvError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportTldv}
                    disabled={importingTldv}
                    className="shrink-0"
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              {' '}
              <Button
                variant="outline"
                onClick={() => setTldvModalOpen(false)}
                disabled={importingTldv}
              >
                Cancelar
              </Button>
              <Button onClick={handleImportTldv} disabled={!tldvMeetingId.trim() || importingTldv}>
                {importingTldv ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando transcrição do TLDV...
                  </>
                ) : (
                  'Carregar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerHeader className="absolute top-0 left-0 right-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b">
            <DrawerTitle>{etapa.titulo}</DrawerTitle>
            <DrawerDescription className="sr-only">Detalhes da execução</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[600px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 pr-12 border-b absolute top-0 left-0 right-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <SheetTitle>{etapa.titulo}</SheetTitle>
          <SheetDescription className="sr-only">Detalhes da execução</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  )
}
