import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, User, LogOut } from 'lucide-react'
import { useNewClient } from '@/contexts/NewClientContext'
import { NewClientModal } from '@/components/NewClientModal'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full w-9 h-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const { setIsOpen } = useNewClient()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/75 dark:bg-slate-900/75 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-tr from-indigo-500 to-pink-500 p-2 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
              <User className="text-white w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              Planos de Sucesso
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsOpen(true)}
              className="hidden sm:flex bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105 hover:animate-pulse transition-all duration-200 rounded-xl font-bold dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:hover:shadow-primary/40"
            >
              <Plus className="w-5 h-5 mr-2 stroke-[3]" /> Novo Cliente
            </Button>
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="sm:hidden bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105 hover:animate-pulse transition-all duration-200 rounded-xl dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:hover:shadow-primary/40"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none focus:ring-2 focus:ring-indigo-600 rounded-full">
                  <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">
                      {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user?.name || 'Perfil'}
                </div>
                <div className="px-2 pb-1.5 text-xs text-slate-500 truncate">{user?.email}</div>
                <DropdownMenuItem
                  onClick={() => {
                    signOut()
                    navigate('/login')
                  }}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>

      <NewClientModal />
    </div>
  )
}
