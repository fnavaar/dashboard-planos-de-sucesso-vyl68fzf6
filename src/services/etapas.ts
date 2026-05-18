import pb from '@/lib/pocketbase/client'

export interface Etapa {
  id: string
  plano_id: string
  titulo: string
  descricao: string
  objetivo: string
  tempo_estimado: string
  ordem: number
  status: 'a_fazer' | 'em_progresso' | 'concluido'
  created: string
  updated: string
}

export const getEtapas = (planoId: string) =>
  pb.collection('etapas').getFullList<Etapa>({ filter: `plano_id = "${planoId}"`, sort: 'ordem' })

export const updateEtapaStatus = (id: string, status: 'a_fazer' | 'em_progresso' | 'concluido') =>
  pb.collection('etapas').update<Etapa>(id, { status })

export const sendSlackNotification = (data: {
  etapa_id: string
  acao: 'concluida' | 'iniciada' | 'atrasada'
  responsavel: string
  cliente_nome: string
}) =>
  pb.send('/backend/v1/sendSlackNotification', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
