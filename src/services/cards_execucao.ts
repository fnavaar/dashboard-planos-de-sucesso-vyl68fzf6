import pb from '@/lib/pocketbase/client'

export interface CardExecucao {
  id: string
  etapa_id: string
  o_que_foi_feito?: string
  passos_seguidos?: string
  como_foi_executado?: string
  quando_foi_executado?: string
  responsavel?: string
  anexos?: string[]
  arquivos_evidencia?: string[]
  feedback_admin?: string
}

export async function getCardExecucaoByEtapa(etapaId: string): Promise<CardExecucao | null> {
  try {
    const records = await pb.collection('cards_execucao').getFullList<CardExecucao>({
      filter: `etapa_id = "${etapaId}"`,
    })
    return records.length > 0 ? records[0] : null
  } catch (err) {
    return null
  }
}

export async function getCardsExecucao(etapaIds: string[]): Promise<CardExecucao[]> {
  if (etapaIds.length === 0) return []
  const filter = etapaIds.map((id) => `etapa_id="${id}"`).join(' || ')
  return pb.collection('cards_execucao').getFullList<CardExecucao>({ filter })
}

export async function createCardExecucao(data: Partial<CardExecucao> | FormData) {
  return pb.collection('cards_execucao').create<CardExecucao>(data)
}

export async function updateCardExecucao(id: string, data: Partial<CardExecucao> | FormData) {
  return pb.collection('cards_execucao').update<CardExecucao>(id, data)
}

export async function deleteCardExecucao(id: string) {
  return pb.collection('cards_execucao').delete(id)
}
