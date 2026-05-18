import pb from '@/lib/pocketbase/client'

export interface Plano {
  id: string
  cliente_id: string
  titulo: string
  descricao: string
  status: 'rascunho' | 'ativo' | 'concluido'
  created: string
  updated: string
}

export const getPlanos = (clienteId: string) =>
  pb.collection('planos').getFullList<Plano>({ filter: `cliente_id = "${clienteId}"` })

export const generatePlan = (clienteId: string) =>
  pb.send(`/backend/v1/clients/${clienteId}/generate-plan`, { method: 'POST' })
