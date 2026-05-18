import pb from '@/lib/pocketbase/client'

export interface Cliente {
  id: string
  nome: string
  objetivo_principal: string
  contexto: string
  status: 'ativo' | 'pausado' | 'concluido'
  data_inicio: string
  progresso: number
  user_id: string
  tldv_meeting_id?: string
  kickoff_transcript?: string
  created: string
  updated: string
}

export const getClientes = (filter?: string, sort?: string) =>
  pb.collection('clientes').getFullList<Cliente>({ filter, sort })

export const getCliente = (id: string) => pb.collection('clientes').getOne<Cliente>(id)

export const createCliente = (data: Partial<Cliente>) =>
  pb.collection('clientes').create<Cliente>(data)

export const updateCliente = (id: string, data: Partial<Cliente>) =>
  pb.collection('clientes').update<Cliente>(id, data)

export const deleteCliente = (id: string) => pb.collection('clientes').delete(id)
