routerAdd(
  'POST',
  '/backend/v1/fetchTLDVTranscript',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')

    const body = e.requestInfo().body || {}
    const etapa_id = body.etapa_id
    const tldv_meeting_id = body.tldv_meeting_id

    if (!etapa_id || typeof etapa_id !== 'string') {
      return e.json(400, { error: 'O campo etapa_id é obrigatório e deve ser texto.' })
    }
    if (!tldv_meeting_id || typeof tldv_meeting_id !== 'string') {
      return e.json(400, { error: 'O campo tldv_meeting_id é obrigatório e deve ser texto.' })
    }

    const userId = e.auth?.id
    if (!userId) {
      return e.json(401, { error: 'Não autenticado.' })
    }

    try {
      const etapa = $app.findRecordById('etapas', etapa_id)
      const plano = $app.findRecordById('planos', etapa.getString('plano_id'))
      const cliente = $app.findRecordById('clientes', plano.getString('cliente_id'))
      if (cliente.getString('user_id') !== userId) {
        return e.json(403, { error: 'Sem permissão para acessar esta etapa.' })
      }
    } catch (err) {
      return e.json(404, { error: 'Etapa não encontrada ou sem permissão.' })
    }

    const tldvKey = $secrets.get('API_TLDV')
    if (!tldvKey) {
      $app.logger().error('Chave da API do TLDV não configurada.')
      return e.json(500, { error: 'Erro interno no servidor.' })
    }

    let meetingDate = new Date().toISOString()
    try {
      const metaRes = $http.send({
        url: `https://api.tldv.io/v1/meetings/${tldv_meeting_id}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tldvKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (metaRes.statusCode === 401) return e.json(401, { error: 'Acesso negado na API do TLDV.' })
      if (metaRes.statusCode === 404)
        return e.json(404, { error: 'Reunião não encontrada no TLDV.' })

      if (metaRes.statusCode === 200 && metaRes.json) {
        if (metaRes.json.created_at) meetingDate = metaRes.json.created_at
        else if (metaRes.json.date) meetingDate = metaRes.json.date
      }
    } catch (err) {
      $app.logger().error('Erro ao buscar metadados do TLDV', 'erro', err.message)
    }

    let transcriptText = ''
    try {
      const transRes = $http.send({
        url: `https://api.tldv.io/v1/meetings/${tldv_meeting_id}/transcript`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tldvKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30,
      })

      if (transRes.statusCode === 401)
        return e.json(401, { error: 'Acesso negado na API do TLDV para transcrição.' })
      if (transRes.statusCode === 404)
        return e.json(404, { error: 'Transcrição não encontrada no TLDV.' })

      if (transRes.statusCode === 200) {
        if (transRes.json) {
          transcriptText =
            typeof transRes.json === 'string' ? transRes.json : JSON.stringify(transRes.json)
        } else {
          transcriptText = new TextDecoder().decode(transRes.body)
        }
      } else {
        $app.logger().error('Erro HTTP ao buscar transcrição', 'status', transRes.statusCode)
        return e.json(500, { error: 'Erro ao buscar transcrição do TLDV.' })
      }
    } catch (err) {
      $app.logger().error('Falha de rede com TLDV', 'erro', err.message)
      return e.json(500, { error: 'Falha de conexão com a API do TLDV.' })
    }

    if (!transcriptText || transcriptText === '{}' || transcriptText.trim().length === 0) {
      return e.json(400, { error: 'Transcrição vazia ou inválida.' })
    }

    let retries = [2000, 4000, 8000]
    let aiResult = null
    let attempt = 0
    let aiErrorMsg = ''

    while (attempt <= retries.length) {
      try {
        const prompt = `Resuma esta transcrição de reunião em 3-5 pontos principais. Formato: lista numerada. Foco em ações, decisões e próximos passos.\n\nTranscrição:\n${transcriptText.substring(0, 15000)}`
        const aiRes = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: 'Você é um assistente que analisa reuniões.' },
            { role: 'user', content: prompt },
          ],
        })
        aiResult = aiRes.choices[0].message.content
        break
      } catch (err) {
        if (err.status === 503 && attempt < retries.length) {
          $app.logger().warn('IA Indisponível (503), tentando novamente', 'tentativa', attempt + 1)
          let end = Date.now() + retries[attempt]
          while (Date.now() < end) {
            /* busy wait fallback */
          }
          attempt++
          continue
        }
        $app.logger().error('Erro no processamento da IA', 'erro', err.message)
        aiErrorMsg = err.message
        break
      }
    }

    if (!aiResult) {
      return e.json(500, {
        error: `Falha ao processar IA: ${aiErrorMsg || 'Serviço Indisponível'}`,
      })
    }

    let methodologies = ''
    try {
      const aiRes2 = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content: 'Identifique as ferramentas ou metodologias mencionadas na transcrição.',
          },
          {
            role: 'user',
            content: `Quais metodologias ou ferramentas (ex: Scrum, Kanban, Figma, AWS, etc) foram mencionadas nesta transcrição? Responda de forma concisa. Se não houver, responda apenas "Nenhuma metodologia específica mencionada.".\n\nTranscrição:\n${transcriptText.substring(0, 15000)}`,
          },
        ],
      })
      methodologies = aiRes2.choices[0].message.content
    } catch (err) {
      methodologies = 'Não foi possível extrair.'
    }

    let card = null
    try {
      card = $app.findFirstRecordByData('cards_execucao', 'etapa_id', etapa_id)
    } catch (err) {}

    const payload = {
      etapa_id: etapa_id,
      o_que_foi_feito: aiResult,
      como_foi_executado: methodologies,
      quando_foi_executado: meetingDate,
    }

    try {
      if (card) {
        card.set('o_que_foi_feito', payload.o_que_foi_feito)
        card.set('como_foi_executado', payload.como_foi_executado)
        card.set('quando_foi_executado', payload.quando_foi_executado)
        $app.save(card)
      } else {
        const collection = $app.findCollectionByNameOrId('cards_execucao')
        card = new Record(collection)
        card.set('etapa_id', payload.etapa_id)
        card.set('o_que_foi_feito', payload.o_que_foi_feito)
        card.set('como_foi_executado', payload.como_foi_executado)
        card.set('quando_foi_executado', payload.quando_foi_executado)
        card.set('responsavel', userId)
        $app.save(card)
      }
    } catch (err) {
      $app.logger().error('Erro ao salvar card de execução', 'erro', err.message)
      return e.json(500, { error: 'Erro ao salvar no banco de dados.' })
    }

    return e.json(200, { data: payload })
  },
  $apis.requireAuth(),
)
