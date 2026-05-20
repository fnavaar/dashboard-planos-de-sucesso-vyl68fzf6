onRecordAfterCreateSuccess((e) => {
  let transcript = e.record.getString('kickoff_transcript')
  const tldvIdRaw = e.record.getString('tldv_meeting_id')

  if (!transcript && !tldvIdRaw) return e.next()

  try {
    if (!transcript && tldvIdRaw) {
      const match = tldvIdRaw.match(/tldv\.io\/app\/meetings\/([a-zA-Z0-9_-]+)/)
      const tldv_meeting_id = match ? match[1] : tldvIdRaw.trim()

      const tldvKey = $secrets.get('API_TLDV')
      if (tldvKey && tldv_meeting_id) {
        const transRes = $http.send({
          url: `https://pasta.tldv.io/v1alpha1/meetings/${tldv_meeting_id}/transcript`,
          method: 'GET',
          headers: { 'x-api-key': tldvKey, 'Content-Type': 'application/json' },
          timeout: 30,
        })
        if (transRes.statusCode === 200) {
          if (transRes.json) {
            transcript =
              typeof transRes.json === 'string' ? transRes.json : JSON.stringify(transRes.json)
          } else {
            transcript = new TextDecoder().decode(transRes.body)
          }
        } else {
          $app.logger().error('TLDV Fetch failed in hook', 'status', transRes.statusCode)
          const histCol = $app.findCollectionByNameOrId('historico_acoes')
          const hist = new Record(histCol)
          hist.set('user_id', e.record.getString('user_id'))
          hist.set('tabela', 'clientes')
          hist.set('registro_id', e.record.id)
          hist.set('acao', 'create')
          hist.set('dados_depois', {
            error: 'Falha ao buscar transcrito do TLDV. Status: ' + transRes.statusCode,
          })
          $app.save(hist)
          return e.next()
        }
      }
    }

    if (!transcript) return e.next()

    const prompt = `Analise o seguinte transcrito de reunião e extraia as informações para criar um plano de sucesso estruturado.

Retorne EXCLUSIVAMENTE um objeto JSON no formato exato:
{
  "objetivo_principal": "string com o principal objetivo do cliente",
  "contexto": "string com o contexto geral, dores e situação atual",
  "plano": {
    "titulo": "string com o nome do plano",
    "descricao": "string com a descricao do plano",
    "etapas": [
      {
        "titulo": "string",
        "descricao": "string",
        "objetivo": "string",
        "tempo_estimado": "string",
        "tasks": [
          {
            "o_que_foi_feito": "string com o que precisa ser feito",
            "passos_seguidos": "string com passos detalhados",
            "como_foi_executado": "string opcional com ferramentas sugeridas"
          }
        ]
      }
    ]
  }
}

Transcrito:
${transcript.substring(0, 150000)}`

    const openAiKey = $secrets.get('API_OPENAI')
    if (!openAiKey) {
      throw new Error('API_OPENAI secret is not configured')
    }

    const aiRes = $http.send({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
      }),
      timeout: 120,
    })

    if (aiRes.statusCode !== 200) {
      throw new Error('Falha na API OpenAI. Status: ' + aiRes.statusCode)
    }

    const content = aiRes.json.choices[0].message.content
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
      const histCol = $app.findCollectionByNameOrId('historico_acoes')
      const hist = new Record(histCol)
      hist.set('user_id', e.record.getString('user_id'))
      hist.set('tabela', 'clientes')
      hist.set('registro_id', e.record.id)
      hist.set('acao', 'create')
      hist.set('dados_depois', {
        error: 'Falha ao processar a resposta da IA. O formato retornado não era um JSON válido.',
      })
      $app.save(hist)
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

      if (!client.getString('kickoff_transcript') && transcript) {
        client.set('kickoff_transcript', transcript)
        clientUpdated = true
      }

      if (clientUpdated) {
        txApp.save(client)
      }

      if (planData.plano) {
        const planosCol = txApp.findCollectionByNameOrId('planos')
        const plan = new Record(planosCol)
        plan.set('cliente_id', client.id)
        plan.set('titulo', planData.plano.titulo || 'Plano de Sucesso: ' + client.getString('nome'))
        plan.set('descricao', planData.plano.descricao || '')
        plan.set('status', 'ativo')
        txApp.save(plan)

        if (planData.plano.etapas && Array.isArray(planData.plano.etapas)) {
          const etapasCol = txApp.findCollectionByNameOrId('etapas')
          const cardsCol = txApp.findCollectionByNameOrId('cards_execucao')

          for (let i = 0; i < planData.plano.etapas.length; i++) {
            const s = planData.plano.etapas[i]
            const etapa = new Record(etapasCol)
            etapa.set('plano_id', plan.id)
            etapa.set('titulo', s.titulo || 'Etapa ' + (i + 1))
            etapa.set('descricao', s.descricao || '')
            etapa.set('objetivo', s.objetivo || '')
            etapa.set('tempo_estimado', s.tempo_estimado || '')
            etapa.set('ordem', i + 1)
            etapa.set('status', 'a_fazer')
            txApp.save(etapa)

            if (s.tasks && Array.isArray(s.tasks)) {
              for (let j = 0; j < s.tasks.length; j++) {
                const t = s.tasks[j]
                const card = new Record(cardsCol)
                card.set('etapa_id', etapa.id)
                card.set('o_que_foi_feito', t.o_que_foi_feito || 'Nova tarefa')
                card.set('passos_seguidos', t.passos_seguidos || '')
                card.set(
                  'como_foi_executado',
                  t.como_foi_executado || 'Gerado automaticamente por IA',
                )
                txApp.save(card)
              }
            }
          }
        }
      }
    })
  } catch (err) {
    $app.logger().error('Erro na análise do kickoff via AI', 'error', err.message)
    try {
      const histCol = $app.findCollectionByNameOrId('historico_acoes')
      const hist = new Record(histCol)
      hist.set('user_id', e.record.getString('user_id'))
      hist.set('tabela', 'clientes')
      hist.set('registro_id', e.record.id)
      hist.set('acao', 'create')
      hist.set('dados_depois', {
        error: 'Falha durante a execução do processo de IA: ' + err.message,
      })
      $app.save(hist)
    } catch (err2) {
      $app.logger().error('Falha ao salvar historico de erro', 'error', err2.message)
    }
  }

  return e.next()
}, 'clientes')
