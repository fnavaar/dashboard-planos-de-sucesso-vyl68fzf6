onRecordAfterCreateSuccess((e) => {
  const transcript = e.record.getString('kickoff_transcript')
  if (!transcript) return e.next()

  try {
    const prompt = `Analise o seguinte transcrito de reunião de kickoff e extraia as informações para criar um plano de sucesso estruturado.

Retorne EXCLUSIVAMENTE um objeto JSON no formato exato:
{
  "objetivo_principal": "string com o principal objetivo do cliente",
  "contexto": "string com o contexto geral, dores e situação atual",
  "etapas": [
    {
      "titulo": "string",
      "descricao": "string",
      "objetivo": "string",
      "tempo_estimado": "string"
    }
  ]
}
Gere entre 5 a 7 etapas coerentes baseadas estritamente na reunião.

Transcrito:
${transcript.substring(0, 50000)}`

    const res = $ai.chat({
      model: 'fast',
      messages: [{ role: 'user', content: prompt }],
    })

    const content = res.choices[0].message.content
    let planData
    try {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        planData = JSON.parse(match[0])
      } else {
        planData = JSON.parse(content)
      }
    } catch (parseErr) {
      $app.logger().error('Falha no parse do JSON da AI', 'content', content)
      return e.next()
    }

    $app.runInTransaction((txApp) => {
      const client = txApp.findRecordById('clientes', e.record.id)
      let clientUpdated = false

      if (planData.objetivo_principal && !client.getString('objetivo_principal')) {
        client.set('objetivo_principal', planData.objetivo_principal)
        clientUpdated = true
      }

      if (planData.contexto && !client.getString('contexto')) {
        client.set('contexto', planData.contexto)
        clientUpdated = true
      }

      if (clientUpdated) {
        txApp.save(client)
      }

      if (planData.etapas && planData.etapas.length > 0) {
        const planosCol = txApp.findCollectionByNameOrId('planos')
        const plan = new Record(planosCol)
        plan.set('cliente_id', client.id)
        plan.set('titulo', 'Plano de Sucesso: ' + client.getString('nome'))
        plan.set('status', 'ativo')
        txApp.save(plan)

        const etapasCol = txApp.findCollectionByNameOrId('etapas')
        for (let i = 0; i < planData.etapas.length; i++) {
          const s = planData.etapas[i]
          const etapa = new Record(etapasCol)
          etapa.set('plano_id', plan.id)
          etapa.set('titulo', s.titulo || 'Etapa ' + (i + 1))
          etapa.set('descricao', s.descricao || '')
          etapa.set('objetivo', s.objetivo || '')
          etapa.set('tempo_estimado', s.tempo_estimado || '')
          etapa.set('ordem', i + 1)
          etapa.set('status', 'a_fazer')
          txApp.save(etapa)
        }
      }
    })
  } catch (err) {
    $app.logger().error('Erro na análise do kickoff via AI', 'error', err.message)
  }

  return e.next()
}, 'clientes')
