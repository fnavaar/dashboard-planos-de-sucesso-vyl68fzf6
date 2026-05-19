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

export const updatePlano = (id: string, data: Partial<Plano>) =>
  pb.collection('planos').update<Plano>(id, data)

export const deletePlano = (id: string) => pb.collection('planos').delete(id)

export const generatePlan = async (
  clienteId: string,
  objetivoPrincipal: string,
  contexto: string,
  signal?: AbortSignal,
) => {
  return pb.send(`/backend/v1/generate-plan`, {
    method: 'POST',
    body: JSON.stringify({
      cliente_id: clienteId,
      objetivo_principal: objetivoPrincipal,
      contexto: contexto,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  })
}
