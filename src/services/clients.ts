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
  expand?: {
    user_id?: {
      id: string
      email: string
      name: string
    }
  }
}

export const getClientes = (filter?: string, sort?: string) =>
  pb.collection('clientes').getFullList<Cliente>({ filter, sort, expand: 'user_id' })

export const getCliente = (id: string) =>
  pb.collection('clientes').getOne<Cliente>(id, { expand: 'user_id' })

export const getClienteByEmail = async (email: string) => {
  return pb
    .collection('clientes')
    .getFirstListItem<Cliente>(`user_id.email = "${email}"`, { expand: 'user_id' })
}

export const createCliente = (data: Partial<Cliente>) =>
  pb.collection('clientes').create<Cliente>(data)

export const updateCliente = (id: string, data: Partial<Cliente>) =>
  pb.collection('clientes').update<Cliente>(id, data)

export const deleteCliente = (id: string) => pb.collection('clientes').delete(id)
