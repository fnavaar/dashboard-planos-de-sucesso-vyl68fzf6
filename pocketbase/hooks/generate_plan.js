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

      const promptInstructions = `Você é um Especialista de Customer Success Sênior da Adapta, uma consultoria de IA Generativa.
Sua missão é criar um Plano de Sucesso para o cliente com base no objetivo e contexto fornecidos.

DIRETRIZES:
1. Metodologia ASA: Incorpore os 3 pilares da Adapta no planejamento:
- Amplificar: IA como co-piloto para produtividade.
- Sistematizar: Estruturação via sistema (Skip).
- Automatizar: Automação de tarefas repetitivas.
2. Contexto de Produtos: Quando fizer sentido, cite e integre Adapta Workspace, Skip e Adapta Pass na jornada.
3. Escopo: Crie entre 7 e 10 etapas sequenciais. Tempos estimados devem ser realistas (1 a 6 meses no total). Etapas iniciais devem focar em diagnóstico, finais em mensuração de resultados.
4. Idioma: Todo o conteúdo deve ser em Português do Brasil (pt-BR).

REQUISITO CRÍTICO - FORMATO DE SAÍDA:
Sua resposta DEVE ser estritamente um JSON válido, sem NENHUM texto antes ou depois, e SEM formatação markdown (sem \`\`\`json).
Estrutura obrigatória:
{
  "plano": {
    "titulo": "string (max 100 chars)",
    "descricao": "string (1-2 paragraphs)",
    "numero_etapas": "integer"
  },
  "etapas": [
    {
      "ordem": "integer",
      "titulo": "string (max 80 chars)",
      "descricao": "string (2-4 sentences)",
      "objetivo": "string (measurable result)",
      "tempo_estimado": "string (ex: '1 semana')"
    }
  ]
}`

      let rawContent = ''
      let retries = 0
      let success = false
      while (retries < 2 && !success) {
        try {
          const res = $ai.chat({
            model: 'fast',
            messages: [
              { role: 'system', content: promptInstructions },
              {
                role: 'user',
                content: `Objetivo do Cliente: ${objetivo_principal}\nContexto: ${contexto || 'Nenhum contexto adicional'}`,
              },
            ],
          })
          rawContent = res.choices?.[0]?.message?.content || ''
          success = true
        } catch (err) {
          retries++
          if (retries >= 2) {
            $app.logger().error('Erro ao chamar a IA após retentativa', 'error', err.message)
            return e.json(500, { error: 'Erro de comunicação com a IA. Tente novamente.' })
          }
        }
      }

      let planData
      rawContent = rawContent.trim()

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
          const match = rawContent.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('No object found')
          planData = JSON.parse(match[0])
        } catch (err) {
          $app.logger().error('Erro ao fazer parse da resposta da IA', 'content', rawContent)
          return e.json(422, {
            error: 'Não foi possível processar a resposta gerada pela IA. Tente novamente.',
          })
        }
      }

      const planoInfo = planData.plano || {}
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
        plan.set('titulo', planoInfo.titulo || 'Plano de Sucesso: ' + client.getString('nome'))
        plan.set('descricao', planoInfo.descricao || '')
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
          etapa.set('ordem', s.ordem || i + 1)
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
          tarefas_geradas: 0,
        },
      })
    } catch (err) {
      $app.logger().error('Erro geral no generatePlan', 'error', err.message)
      return e.json(500, { error: 'Ocorreu um erro interno. Tente novamente mais tarde.' })
    }
  },
  $apis.requireAuth(),
)
