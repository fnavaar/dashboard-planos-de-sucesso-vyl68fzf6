import pb from '@/lib/pocketbase/client'

export interface Etapa {
  id: string
  plano_id: string
  titulo: string
  descricao: string
  objetivo: string
  tempo_estimado: string
  ordem: number
  status: 'a_fazer' | 'em_progresso' | 'aguardando_aprovacao' | 'concluido'
  created: string
  updated: string
}

export const getEtapas = (planoId: string) =>
  pb.collection('etapas').getFullList<Etapa>({ filter: `plano_id = "${planoId}"`, sort: 'ordem' })

export const updateEtapaStatus = (
  id: string,
  status: 'a_fazer' | 'em_progresso' | 'aguardando_aprovacao' | 'concluido',
  fullEtapa?: Etapa,
) => {
  const payload: any = { status }
  if (fullEtapa) {
    payload.titulo = fullEtapa.titulo
    payload.plano_id = fullEtapa.plano_id
  }
  return pb.collection('etapas').update<Etapa>(id, payload)
}

export const updateEtapa = (id: string, data: Partial<Etapa>) =>
  pb.collection('etapas').update<Etapa>(id, data)

export const deleteEtapa = (id: string) => pb.collection('etapas').delete(id)

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
