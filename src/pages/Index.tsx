import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClientes, Cliente } from '@/services/clients'
import { useRealtime } from '@/hooks/use-realtime'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Search, FolderOpen, RefreshCcw, Filter, Users, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNewClient } from '@/contexts/NewClientContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

const AnimatedProgress = ({ value }: { value: number }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(value), 100)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <Progress
      value={progress}
      className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full"
      indicatorClassName="bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-1000 ease-out"
    />
  )
}

export default function Index() {
  const [clients, setClients] = useState<Cliente[]>([])
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
        conditions.push(`nome ~ "${debouncedSearch.replace(/"/g, '\\"')}"`)
      }
      if (statusFilter !== 'Todos') {
        const filterVal =
          statusFilter === 'Ativo' ? 'ativo' : statusFilter === 'Pausado' ? 'pausado' : 'concluido'
        conditions.push(`status = "${filterVal}"`)
      }
      if (conditions.length > 0) {
        filter = conditions.join(' && ')
      }

      const data = await getClientes(filter, '-created')
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

  useRealtime('clientes', () => {
    loadData()
  })

  const FilterSidebar = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" />
          Buscar
        </h3>
        <Input
          placeholder="Nome do cliente..."
          className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl h-12 focus-visible:ring-indigo-500 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTime(e.target.value)}
        />
      </div>
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-pink-500" />
          Filtros
        </h3>
        <div className="space-y-2">
          {['Todos', 'Ativo', 'Pausado', 'Concluído'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'w-full text-left px-5 py-3 rounded-xl transition-all duration-200 font-bold',
                statusFilter === status
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 shrink-0">
        <div className="sticky top-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <FilterSidebar />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-500/20 p-2.5 rounded-xl">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Meus Clientes
            </h1>
          </div>

          {/* Mobile Filter Drawer */}
          <div className="md:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl font-bold h-12 border-2 dark:border-secondary dark:text-secondary dark:hover:bg-secondary/20"
                >
                  <Filter className="w-5 h-5 mr-2 text-indigo-500 dark:text-primary" /> Filtros
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="text-xl font-extrabold">Filtros de Busca</DrawerTitle>
                </DrawerHeader>
                <div className="p-6">
                  <FilterSidebar />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className="p-6 space-y-4 rounded-[1.5rem] border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/2 rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="bg-red-50 dark:bg-red-500/20 p-5 rounded-full mb-6">
              <RefreshCcw className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-extrabold mb-3">Erro ao carregar</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">
              Ocorreu um problema de conexão. Não se preocupe, vamos tentar novamente!
            </p>
            <Button
              onClick={loadData}
              className="rounded-xl font-bold h-12 px-8 bg-indigo-600 hover:bg-indigo-500"
            >
              Tentar Novamente
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-indigo-50 dark:bg-indigo-500/20 p-5 rounded-full mb-6">
              <FolderOpen className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-extrabold mb-3">Nenhum cliente por aqui</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">
              Adicione seu primeiro cliente para começar a acompanhar o progresso!
            </p>
            <Button
              onClick={() => setIsOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold h-12 px-8 shadow-md hover:shadow-indigo-500/40 hover:scale-105 hover:animate-pulse transition-all duration-200 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:hover:shadow-primary/40"
            >
              Novo Cliente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client, i) => (
              <Card
                key={client.id}
                onClick={() => navigate(`/cliente/${client.expand?.user_id?.email || client.id}`)}
                className="group relative p-6 cursor-pointer border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:scale-[1.03] transition-all duration-200 animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-4 border-slate-50 dark:border-slate-800 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-pink-500 text-white font-extrabold text-xl">
                        {client.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1 text-lg">
                        {client.nome}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {format(new Date(client.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-6 space-y-4">
                  <Badge
                    className={cn(
                      'font-extrabold rounded-full px-4 py-1.5 border-0 shadow-sm text-xs capitalize',
                      client.status === 'ativo' &&
                        'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                      client.status === 'pausado' &&
                        'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      client.status === 'concluido' &&
                        'bg-blue-100 text-blue-700 hover:bg-blue-200',
                    )}
                  >
                    {client.status}
                  </Badge>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                    <span className="font-bold text-slate-900 dark:text-slate-200 mr-1.5">🎯</span>
                    {client.objetivo_principal}
                  </p>
                </div>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      Progresso
                    </span>
                    <span
                      className={cn(
                        client.progresso === 100 ? 'text-emerald-600' : 'text-indigo-600',
                      )}
                    >
                      {client.progresso}%
                    </span>
                  </div>
                  <AnimatedProgress value={client.progresso} />
                </div>{' '}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
