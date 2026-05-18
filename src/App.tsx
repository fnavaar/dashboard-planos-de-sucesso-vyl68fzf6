import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { NewClientProvider } from '@/contexts/NewClientContext'

import Index from './pages/Index'
import ClientDetails from './pages/ClientDetails'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NewClientProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/cliente/:id" element={<ClientDetails />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NewClientProvider>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
