import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { User, Lock, Mail, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SignUp() {
  const { signUp, isAuthenticated } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signUpError } = await signUp(email, password, name)
    if (signUpError) {
      setError('Erro ao criar conta. Verifique os dados e tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-pink-500 rounded-xl mb-6 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Criar Conta</h1>
          <p className="text-slate-500 mt-2">Junte-se ao Planos de Sucesso</p>
        </div>

        <Card className="p-8 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Cadastrar'}
            </Button>

            <div className="text-center text-sm text-slate-500 mt-4">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-pink-500 hover:underline font-medium">
                Faça Login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
