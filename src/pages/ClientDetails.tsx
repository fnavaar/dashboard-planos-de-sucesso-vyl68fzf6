import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient, Client } from '@/services/clients'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ArrowLeft,
  CalendarDays,
  Target,
  FileText,
  CheckCircle2,
  Clock,
  PauseCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchClient = async () => {
      try {
        setLoading(true)
        const data = await getClient(id)
        setClient(data)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card className="p-8">
          <div className="flex gap-6 items-start">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-4 flex-1">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-2 w-full mt-8" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">Cliente não encontrado</h2>
        <Button onClick={() => navigate('/')} variant="outline">
          Voltar para o Dashboard
        </Button>
      </div>
    )
  }

  const StatusIcon =
    client.status === 'Ativo' ? Clock : client.status === 'Pausado' ? PauseCircle : CheckCircle2

  return (
    <div className="space-y-6 animate-fade-in">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="text-slate-500 hover:text-slate-900 -ml-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
              <Avatar className="h-20 w-20 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-2xl font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white line-clamp-2">
                    {client.name}
                  </h1>
                  <Badge
                    className={cn(
                      'w-fit px-3 py-1 text-sm flex items-center gap-2',
                      client.status === 'Ativo'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : client.status === 'Pausado'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    )}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {client.status}
                  </Badge>
                </div>
                <div className="flex items-center text-slate-500 gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    Iniciado em{' '}
                    {format(new Date(client.start_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Progresso Geral</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {client.progress}%
                  </p>
                </div>
                <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  Plano Elite
                </div>
              </div>
              <Progress
                value={client.progress}
                className="h-3 bg-slate-200 dark:bg-slate-800"
                indicatorClassName={cn(
                  client.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600',
                )}
              />
            </div>
          </Card>

          <Card className="p-8 border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              Objetivo Principal
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              {client.goal}
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-8 border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Contexto do Cliente
            </h2>
            <div className="prose dark:prose-invert prose-slate text-slate-600 dark:text-slate-400">
              <p className="whitespace-pre-wrap leading-relaxed">{client.context}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
