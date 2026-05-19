routerAdd(
  'POST',
  '/backend/v1/fetch-tldv-transcript',
  async (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const body = e.requestInfo().body || {}
    const etapa_id = body.etapa_id
    let tldv_meeting_id = body.tldv_meeting_id

    if (etapa_id !== undefined && etapa_id !== null && typeof etapa_id !== 'string') {
      return e.json(400, { error: 'O campo etapa_id deve ser texto se fornecido.' })
    }
    if (!tldv_meeting_id || typeof tldv_meeting_id !== 'string') {
      return e.json(400, { error: 'O campo tldv_meeting_id é obrigatório e deve ser texto.' })
    }

    const match = tldv_meeting_id.match(/tldv\.io\/app\/meetings\/([a-zA-Z0-9_-]+)/)
    tldv_meeting_id = match ? match[1] : tldv_meeting_id.trim()

    if (!tldv_meeting_id) {
      return e.json(400, { error: 'O campo tldv_meeting_id é inválido.' })
    }

    const userId = e.auth?.id
    if (!userId) {
      return e.json(401, { error: 'Não autenticado.' })
    }

    let objetivo = 'Mapeamento inicial do plano de sucesso do cliente'
    if (etapa_id) {
      try {
        const etapa = $app.findRecordById('etapas', etapa_id)
        const plano = $app.findRecordById('planos', etapa.getString('plano_id'))
        const cliente = $app.findRecordById('clientes', plano.getString('cliente_id'))
        if (cliente.getString('user_id') !== userId) {
          return e.json(403, { error: 'Sem permissão para acessar esta etapa.' })
        }
        const obj = etapa.getString('objetivo')
        if (obj && obj.trim().length > 0) {
          objetivo = obj.trim()
        }
      } catch (err) {
        return e.json(404, { error: 'Etapa não encontrada ou sem permissão.' })
      }
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

      if (metaRes.statusCode === 401)
        return e.json(401, { error: 'Erro de autenticação com TLDV.' })
      if (metaRes.statusCode === 404) return e.json(404, { error: 'Reunião não encontrada.' })

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
        return e.json(401, { error: 'Erro de autenticação com TLDV.' })
      if (transRes.statusCode === 404) return e.json(404, { error: 'Reunião não encontrada.' })

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
        const prompt = `Objetivo da etapa: ${objetivo}\n\nTranscrição da reunião:\n${transcriptText.substring(0, 15000)}\n\nExtraia as informações solicitadas nas instruções do sistema. Retorne APENAS um objeto JSON válido com as seguintes chaves:\n- "o_que_foi_feito": A lista numerada com os pontos principais em português.\n- "como_foi_executado": A metodologia ou ferramentas mencionadas.`
        const aiRes = $ai.agent('tldv-analyzer').chat({
          user_id: userId,
          message: prompt,
        })
        aiResult = aiRes.content
        break
      } catch (err) {
        let isRetryable = false
        if (err.status === 503 || err.status === 502) {
          isRetryable = true
        } else if (err.name === 'SkipAiConfigError' || err.name === 'SkipAiError') {
          isRetryable = true
        }

        if (isRetryable && attempt < retries.length) {
          $app.logger().warn('IA Indisponível, tentando novamente', 'tentativa', attempt + 1)
          await sleep(retries[attempt])
          attempt++
          continue
        }
        $app.logger().error('Erro no processamento da IA', 'erro', err.message || String(err))
        aiErrorMsg = err.message || String(err)
        break
      }
    }

    if (!aiResult) {
      return e.json(500, {
        error: `Falha ao processar IA: ${aiErrorMsg || 'Serviço Indisponível'}`,
      })
    }

    let parsedResult = {}
    try {
      let jsonText = aiResult
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsedResult = JSON.parse(jsonText)
    } catch (e) {
      parsedResult = {
        o_que_foi_feito: aiResult,
        como_foi_executado: 'Não foi possível extrair a metodologia separadamente.',
      }
    }

    const payload = {
      etapa_id: etapa_id || null,
      o_que_foi_feito: parsedResult.o_que_foi_feito || '',
      como_foi_executado: parsedResult.como_foi_executado || '',
      quando_foi_executado: meetingDate,
    }

    if (etapa_id) {
      let card = null
      try {
        card = $app.findFirstRecordByData('cards_execucao', 'etapa_id', etapa_id)
      } catch (err) {}

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
    }

    return e.json(200, { data: payload })
  },
  $apis.requireAuth(),
)
