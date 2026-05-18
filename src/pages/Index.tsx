import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, Client } from '@/services/clients'
import { useRealtime } from '@/hooks/use-realtime'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Search, FolderOpen, RefreshCcw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNewClient } from '@/contexts/NewClientContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Index() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTime] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [statusFilter, setStatusFilter] = useState<string>('Todos')
  const navigate = useNavigate()
  const { setIsOpen } = useNewClient()

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)

      let filter = ''
      const conditions = []
      if (debouncedSearch) {
        conditions.push(`name ~ "${debouncedSearch.replace(/"/g, '\\"')}"`)
      }
      if (statusFilter !== 'Todos') {
        conditions.push(`status = "${statusFilter}"`)
      }
      if (conditions.length > 0) {
        filter = conditions.join(' && ')
      }

      const data = await getClients(filter, '-created')
      setClients(data)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [debouncedSearch, statusFilter])

  useRealtime('clients', () => {
    loadData()
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 bg-white dark:bg-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTime(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-slate-900">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Pausado">Pausado</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
            <RefreshCcw className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar clientes</h2>
          <p className="text-slate-500 mb-6">
            Ocorreu um problema ao buscar os dados. Tente novamente.
          </p>
          <Button onClick={loadData} variant="outline">
            Recarregar
          </Button>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-full mb-4">
            <FolderOpen className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Nenhum cliente ainda</h2>
          <p className="text-slate-500 mb-6">
            Crie seu primeiro cliente para começar a acompanhar os planos de sucesso.
          </p>
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Novo Cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client, i) => (
            <Card
              key={client.id}
              onClick={() => navigate(`/cliente/${client.id}`)}
              className="p-6 cursor-pointer border-slate-200 dark:border-slate-800 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-100 dark:border-slate-800">
                    <AvatarFallback className="bg-indigo-50 text-indigo-600 font-semibold">
                      {client.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                      {client.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Início: {format(new Date(client.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge
                  className={cn(
                    'font-medium',
                    client.status === 'Ativo'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : client.status === 'Pausado'
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {client.status}
                </Badge>
              </div>

              <div className="mb-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Objetivo: </span>
                  {client.goal}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Progresso</span>
                  <span
                    className={cn(client.progress === 100 ? 'text-emerald-600' : 'text-indigo-600')}
                  >
                    {client.progress}%
                  </span>
                </div>
                <Progress
                  value={client.progress}
                  className="h-2 bg-slate-100 dark:bg-slate-800"
                  indicatorClassName={cn(
                    client.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600',
                  )}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
