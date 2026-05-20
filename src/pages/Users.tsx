import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { getUsers, User as UserType, createUser } from '@/services/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users as UsersIcon, Plus, Loader2 } from 'lucide-react'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Badge } from '@/components/ui/badge'

export default function Users() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)

  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' })
  const [creating, setCreating] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers()
    }
  }, [user])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setCreating(true)

    try {
      await createUser(formData)
      toast({ title: 'Usuário criado com sucesso!' })
      setIsOpen(false)
      setFormData({ name: '', email: '', password: '', role: 'user' })
      loadUsers()
    } catch (err) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      toast({
        title: 'Erro ao criar usuário',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
            <UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          Usuários
        </h1>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
              <Plus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema. Apenas administradores podem realizar esta
                ação.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome do usuário"
                />
                {fieldErrors.name && <p className="text-sm text-red-500">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="usuario@exemplo.com"
                />
                {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
                {fieldErrors.password && (
                  <p className="text-sm text-red-500">{fieldErrors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.role && <p className="text-sm text-red-500">{fieldErrors.role}</p>}
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="w-[300px]">Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[150px]">Função</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {u.name || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        className={
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : ''
                        }
                      >
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
