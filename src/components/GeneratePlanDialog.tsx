import { useState, useEffect } from 'react'
import { Cliente } from '@/services/clients'
import { generatePlan } from '@/services/planos'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  client: Cliente
  onSuccess: () => void
  trigger?: React.ReactNode
}

export function GeneratePlanDialog({ client, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [objetivo, setObjetivo] = useState(client.objetivo_principal || '')
  const [contexto, setContexto] = useState(client.contexto || '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (open) {
      setObjetivo(client.objetivo_principal || '')
      setContexto(client.contexto || '')
      setStatus('idle')
    }
  }, [open, client])

  const handleGenerate = async () => {
    if (objetivo.length < 10) return

    setStatus('loading')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const res = (await generatePlan(client.id, objetivo, contexto, controller.signal)) as any
      clearTimeout(timeoutId)

      const generatedTasks = res?.data?.tarefas_geradas || res?.tarefas_geradas || 0
      if (generatedTasks > 0) {
        toast.success(`Mapeamento concluído: ${generatedTasks} novas tarefas adicionadas à jornada`)
      } else {
        toast.success('Plano gerado com sucesso!')
      }

      setOpen(false)
      onSuccess()
    } catch (err) {
      setStatus('error')
    }
  }

  const isValid = objetivo.trim().length >= 10

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (status !== 'loading') setOpen(val)
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200">
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Plano com IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {status === 'loading' ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
              Gerando seu plano com IA...
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Erro ao gerar plano. Tente novamente.
            </p>
            <Button onClick={handleGenerate} className="mt-4 w-full sm:w-auto" variant="default">
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Gerar Plano de Sucesso</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="objetivo">
                  Objetivo principal <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="objetivo"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Ex: Aumentar o engajamento na plataforma em 30% nos próximos 3 meses."
                  className={cn(
                    'min-h-[100px]',
                    objetivo.length > 0 && !isValid
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : '',
                  )}
                />
                {objetivo.length > 0 && !isValid && (
                  <p className="text-xs text-red-500 font-medium">
                    O objetivo deve ter pelo menos 10 caracteres.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contexto">Contexto (Opcional)</Label>
                <Textarea
                  id="contexto"
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder="Informações adicionais que podem ajudar a IA a gerar um plano melhor..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!isValid}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Gerar Plano <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
