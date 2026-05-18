import { useState } from 'react'
import { Cliente, updateCliente } from '@/services/clients'
import { Etapa } from '@/services/etapas'
import { Plano } from '@/services/planos'
import { GeneratePlanDialog } from '@/components/GeneratePlanDialog'
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
import { Clock, PauseCircle, CheckCircle2, TrendingUp, CalendarDays, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  client: Cliente
  plano: Plano | null
  etapas: Etapa[]
  onUpdate: () => void
  onConfetti: () => void
}

export function ClientHeader({ client, plano, etapas, onUpdate, onConfetti }: Props) {
  const StatusIcon =
    client.status === 'ativo' ? Clock : client.status === 'pausado' ? PauseCircle : CheckCircle2

  const totalEtapas = etapas.length
  const concluidas = etapas.filter((e) => e.status === 'concluido').length
  const progressPercentage = totalEtapas === 0 ? 0 : Math.round((concluidas / totalEtapas) * 100)
  const nextStep = etapas.find((e) => e.status === 'a_fazer' || e.status === 'em_progresso')

  return (
    <Card className="p-6 md:p-8 border-none bg-gradient-to-r from-indigo-500 to-pink-500 shadow-md transition-all duration-200">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-white/20 shadow-sm bg-white/10 shrink-0">
              <AvatarFallback className="bg-transparent text-white text-2xl font-bold">
                {client.nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold text-white line-clamp-2">{client.nome}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      'px-3 py-1 text-sm flex items-center gap-2 capitalize border-none',
                      client.status === 'ativo'
                        ? 'bg-emerald-400/20 text-emerald-50'
                        : client.status === 'pausado'
                          ? 'bg-amber-400/20 text-amber-50'
                          : 'bg-white/20 text-white',
                    )}
                  >
                    <StatusIcon className="w-4 h-4" /> {client.status}
                  </Badge>
                  <EditClientDialog client={client} onUpdate={onUpdate} />
                  {!plano && (
                    <GeneratePlanDialog
                      client={client}
                      onSuccess={() => {
                        onUpdate()
                        onConfetti()
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center text-white/80 gap-2 text-sm">
                <CalendarDays className="w-4 h-4" />
                <span>
                  Iniciado em{' '}
                  {format(new Date(client.data_inicio), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <p className="text-sm font-semibold text-white/90 mb-1">Objetivo Principal</p>
            <p className="text-white/80">{client.objetivo_principal}</p>
          </div>
        </div>

        <div className="md:w-[350px] space-y-4 bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-sm shrink-0">
          <h3 className="font-bold flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-emerald-300" /> Progresso do Plano
          </h3>
          <div className="h-4 rounded-full bg-black/20 overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-bold text-white">{progressPercentage}%</p>
            <p className="text-sm text-white/80">
              {concluidas} de {totalEtapas} etapas
            </p>
          </div>

          {nextStep && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg border border-white/20 shadow-sm animate-fade-in-up">
              <p className="text-xs font-semibold text-emerald-300 mb-1 uppercase tracking-wider">
                Próximo Passo
              </p>
              <p className="font-medium text-sm text-white line-clamp-2">{nextStep.titulo}</p>
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
        <Button
          variant="secondary"
          size="sm"
          className="bg-white/20 hover:bg-white/30 text-white border-none shadow-sm transition-all duration-200"
        >
          <Edit className="w-4 h-4 mr-2" /> Editar
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
            <Button type="submit" disabled={loading} className="transition-all duration-200">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
