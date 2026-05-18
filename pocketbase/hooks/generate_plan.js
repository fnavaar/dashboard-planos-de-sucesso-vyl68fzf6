routerAdd(
  'POST',
  '/backend/v1/clients/{id}/generate-plan',
  (e) => {
    const id = e.request.pathValue('id')
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const client = $app.findRecordById('clientes', id)
    if (client.getString('user_id') !== userId) return e.forbiddenError('not owner')

    let existing = null
    try {
      existing = $app.findFirstRecordByData('planos', 'cliente_id', id)
    } catch (_) {}

    if (existing) return e.badRequestError('plan already exists')

    const prompt = `Você é um especialista em Customer Success. Crie um plano de sucesso gamificado para um cliente com os seguintes detalhes:
Objetivo Principal: ${client.getString('objetivo_principal')}
Contexto: ${client.getString('contexto')}

Sua resposta deve ser EXATAMENTE um array JSON contendo as etapas do plano. O plano deve ter cerca de 4 a 6 etapas.
Cada etapa (objeto) deve conter:
- "titulo" (string curta e engajadora)
- "descricao" (string detalhando o que fazer)
- "objetivo" (string clara)
- "tempo_estimado" (string, ex: "1 semana", "3 dias")
- "ordem" (number, começando em 1)

NÃO inclua texto adicional, markdown ou explicações. Apenas o array JSON puro.`

    const reply = $ai.chat({
      model: 'fast',
      messages: [{ role: 'system', content: prompt }],
    })

    let stages = []
    try {
      const raw = reply.choices[0].message.content
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) {
        stages = JSON.parse(match[0])
      } else {
        stages = JSON.parse(raw)
      }
    } catch (err) {
      return e.internalServerError('Failed to parse AI response')
    }

    let planId = ''
    $app.runInTransaction((txApp) => {
      const planosCol = txApp.findCollectionByNameOrId('planos')
      const plan = new Record(planosCol)
      plan.set('cliente_id', id)
      plan.set('titulo', 'Plano de Sucesso: ' + client.getString('nome'))
      plan.set('status', 'ativo')
      txApp.save(plan)
      planId = plan.id

      const etapasCol = txApp.findCollectionByNameOrId('etapas')
      for (const s of stages) {
        const etapa = new Record(etapasCol)
        etapa.set('plano_id', plan.id)
        etapa.set('titulo', s.titulo)
        etapa.set('descricao', s.descricao)
        etapa.set('objetivo', s.objetivo)
        etapa.set('tempo_estimado', s.tempo_estimado)
        etapa.set('ordem', s.ordem)
        etapa.set('status', 'a_fazer')
        txApp.save(etapa)
      }
    })

    return e.json(200, { success: true, plan_id: planId })
  },
  $apis.requireAuth(),
)
