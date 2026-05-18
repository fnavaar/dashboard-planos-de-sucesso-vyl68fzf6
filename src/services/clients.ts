import pb from '@/lib/pocketbase/client'

export interface Client {
  id: string
  name: string
  goal: string
  context: string
  status: 'Ativo' | 'Pausado' | 'Concluído'
  start_date: string
  progress: number
  user_id: string
  created: string
  updated: string
}

export const getClients = (filter?: string, sort?: string) =>
  pb.collection('clients').getFullList<Client>({ filter, sort })

export const getClient = (id: string) => pb.collection('clients').getOne<Client>(id)

export const createClient = (data: Partial<Client>) => pb.collection('clients').create<Client>(data)

export const updateClient = (id: string, data: Partial<Client>) =>
  pb.collection('clients').update<Client>(id, data)

export const deleteClient = (id: string) => pb.collection('clients').delete(id)
