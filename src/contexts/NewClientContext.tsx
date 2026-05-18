import { createContext, useContext, useState, ReactNode } from 'react'

interface NewClientContextType {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const NewClientContext = createContext<NewClientContextType | undefined>(undefined)

export const useNewClient = () => {
  const context = useContext(NewClientContext)
  if (!context) throw new Error('useNewClient must be used within NewClientProvider')
  return context
}

export const NewClientProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <NewClientContext.Provider value={{ isOpen, setIsOpen }}>{children}</NewClientContext.Provider>
  )
}
