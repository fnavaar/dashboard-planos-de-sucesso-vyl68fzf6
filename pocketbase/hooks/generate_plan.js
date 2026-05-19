routerAdd('OPTIONS', '/backend/v1/generate-plan', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'authorization, apikey, content-type')
  return e.noContent(204)
})

routerAdd(
  'POST',
  '/backend/v1/generate-plan',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.json(401, { error: 'Não autorizado.' })

      const body = e.requestInfo().body || {}
      const cliente_id = body.cliente_id
      const objetivo_principal = body.objetivo_principal
      const contexto = body.contexto

      if (!cliente_id || typeof cliente_id !== 'string') {
        return e.json(400, { error: 'O campo cliente_id é inválido.' })
      }
      if (
        !objetivo_principal ||
        typeof objetivo_principal !== 'string' ||
        objetivo_principal.trim().length < 10
      ) {
        return e.json(400, {
          error: 'O objetivo_principal é obrigatório e deve ter no mínimo 10 caracteres.',
        })
      }

      let client
      try {
        client = $app.findRecordById('clientes', cliente_id)
      } catch (_) {
        return e.json(400, { error: 'Cliente não encontrado.' })
      }

      if (client.getString('user_id') !== userId) {
        return e.json(400, { error: 'Acesso negado ao cliente.' })
      }

      const agentPayload = {
        objetivo: objetivo_principal,
        contexto: contexto || '',
        empresa: 'Adapta',
      }

      const promptInstructions = `
Por favor, analise as informações fornecidas e retorne um plano de sucesso.
REQUISITO CRÍTICO: Sua resposta deve ser APENAS um objeto JSON válido, sem texto antes ou depois, sem blocos de formatação markdown (\`\`\`json). A estrutura do JSON deve ser:
{
  "titulo": "Plano de Sucesso: [Nome do Plano]",
  "descricao": "Breve descrição geral",
  "etapas": [
    {
      "titulo": "Nome da Etapa",
      "descricao": "Descrição detalhada",
      "objetivo": "Objetivo desta etapa",
      "tempo_estimado": "ex: 1 semana"
    }
  ]
}

Dados:
${JSON.stringify(agentPayload)}
`

      let result
      let retries = 0
      while (retries < 2) {
        try {
          result = $ai.agent('agente-mapass').chat({
            user_id: userId,
            message: promptInstructions,
          })
          break
        } catch (err) {
          retries++
          if (retries >= 2) {
            $app.logger().error('Erro ao chamar o agente após retentativa', 'error', err.message)
            return e.json(500, { error: 'Erro de comunicação com a IA. Tente novamente.' })
          }
        }
      }

      let planData
      let rawContent = (result.content || '').trim()

      // Limpeza de blocos de markdown
      if (rawContent.startsWith('```json')) {
        rawContent = rawContent.substring(7)
      } else if (rawContent.startsWith('```')) {
        rawContent = rawContent.substring(3)
      }
      if (rawContent.endsWith('```')) {
        rawContent = rawContent.slice(0, -3)
      }
      rawContent = rawContent.trim()

      try {
        planData = JSON.parse(rawContent)
      } catch (_) {
        try {
          // Última tentativa: extrair via regex o primeiro bloco {}
          const match = rawContent.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('No object found')
          planData = JSON.parse(match[0])
        } catch (err) {
          $app.logger().error('Erro ao fazer parse da resposta da IA', 'content', result.content)
          return e.json(422, {
            error: 'Não foi possível processar a resposta gerada pela IA. Tente novamente.',
          })
        }
      }

      const steps = planData.etapas || []
      if (steps.length < 7 || steps.length > 10) {
        $app
          .logger()
          .warn('AI retornou um número de etapas fora do esperado (7 a 10)', 'count', steps.length)
      }

      let planId = ''
      let createdEtapas = []

      $app.runInTransaction((txApp) => {
        const planosCol = txApp.findCollectionByNameOrId('planos')
        const plan = new Record(planosCol)
        plan.set('cliente_id', cliente_id)
        plan.set('titulo', planData.titulo || 'Plano de Sucesso: ' + client.getString('nome'))
        plan.set('descricao', planData.descricao || '')
        plan.set('status', 'ativo')
        txApp.save(plan)
        planId = plan.id

        const etapasCol = txApp.findCollectionByNameOrId('etapas')
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i]
          const etapa = new Record(etapasCol)
          etapa.set('plano_id', plan.id)
          etapa.set('titulo', s.titulo || '')
          etapa.set('descricao', s.descricao || '')
          etapa.set('objetivo', s.objetivo || '')
          etapa.set('tempo_estimado', s.tempo_estimado || '')
          etapa.set('ordem', i + 1)
          etapa.set('status', 'a_fazer')
          txApp.save(etapa)

          createdEtapas.push({
            id: etapa.id,
            titulo: etapa.getString('titulo'),
            descricao: etapa.getString('descricao'),
            objetivo: etapa.getString('objetivo'),
            tempo_estimado: etapa.getString('tempo_estimado'),
            ordem: etapa.getInt('ordem'),
            status: etapa.getString('status'),
          })
        }
      })

      return e.json(200, {
        data: {
          plano_id: planId,
          etapas: createdEtapas,
        },
      })
    } catch (err) {
      $app.logger().error('Erro geral no generatePlan', 'error', err.message)
      return e.json(500, { error: 'Ocorreu um erro interno. Tente novamente mais tarde.' })
    }
  },
  $apis.requireAuth(),
)
