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
