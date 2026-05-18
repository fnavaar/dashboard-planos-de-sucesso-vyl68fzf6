import { useState } from 'react'
import { Cliente, updateCliente } from '@/services/clients'
import { Etapa } from '@/services/etapas'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Clock, PauseCircle, CheckCircle2, TrendingUp, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  client: Cliente
  etapas: Etapa[]
  onUpdate: () => void
}

export function ClientHeader({ client, etapas, onUpdate }: Props) {
  const StatusIcon =
    client.status === 'ativo' ? Clock : client.status === 'pausado' ? PauseCircle : CheckCircle2

  const totalEtapas = etapas.length
  const concluidas = etapas.filter((e) => e.status === 'concluido').length
  const progressPercentage = totalEtapas === 0 ? 0 : Math.round((concluidas / totalEtapas) * 100)
  const nextStep = etapas.find((e) => e.status === 'a_fazer' || e.status === 'em_progresso')

  return (
    <Card className="p-6 md:p-8 border-slate-200 dark:border-slate-800">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-indigo-100 shadow-sm">
              <AvatarFallback className="bg-indigo-50 text-indigo-600 text-2xl font-bold">
                {client.nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white line-clamp-2">
                  {client.nome}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      'px-3 py-1 text-sm flex items-center gap-2 capitalize',
                      client.status === 'ativo'
                        ? 'bg-emerald-100 text-emerald-700'
                        : client.status === 'pausado'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    <StatusIcon className="w-4 h-4" /> {client.status}
                  </Badge>
                  <EditClientDialog client={client} onUpdate={onUpdate} />
                </div>
              </div>
              <div className="flex items-center text-slate-500 gap-2 text-sm">
                <CalendarDays className="w-4 h-4" />
                <span>
                  Iniciado em{' '}
                  {format(new Date(client.data_inicio), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              Objetivo Principal
            </p>
            <p className="text-slate-700 dark:text-slate-300">{client.objetivo_principal}</p>
          </div>
        </div>

        <div className="md:w-[350px] space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
          <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <TrendingUp className="w-5 h-5 text-pink-500" /> Progresso do Plano
          </h3>
          <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {progressPercentage}%
            </p>
            <p className="text-sm text-slate-500">
              {concluidas} de {totalEtapas} etapas
            </p>
          </div>

          {nextStep && (
            <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in-up">
              <p className="text-xs font-semibold text-indigo-500 mb-1 uppercase tracking-wider">
                Próximo Passo
              </p>
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                {nextStep.titulo}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function EditClientDialog({ client, onUpdate }: { client: Cliente; onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await updateCliente(client.id, {
        nome: formData.get('nome') as string,
        objetivo_principal: formData.get('objetivo_principal') as string,
        contexto: formData.get('contexto') as string,
        status: formData.get('status') as Cliente['status'],
      })
      toast.success('Cliente atualizado com sucesso')
      setOpen(false)
      onUpdate()
    } catch (err) {
      toast.error('Erro ao atualizar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" defaultValue={client.nome} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={client.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivo_principal">Objetivo Principal</Label>
              <Textarea
                id="objetivo_principal"
                name="objetivo_principal"
                defaultValue={client.objetivo_principal}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contexto">Contexto</Label>
              <Textarea id="contexto" name="contexto" defaultValue={client.contexto} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
