routerAdd(
  'POST',
  '/backend/v1/fetch-tldv-transcript',
  async (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const body = e.requestInfo().body || {}
    let etapa_id = body.etapa_id
    const cliente_id = body.cliente_id
    let tldv_meeting_id = body.tldv_meeting_id

    if (etapa_id !== undefined && etapa_id !== null && typeof etapa_id !== 'string') {
      return e.json(400, { error: 'O campo etapa_id deve ser texto se fornecido.' })
    }
    if (cliente_id !== undefined && cliente_id !== null && typeof cliente_id !== 'string') {
      return e.json(400, { error: 'O campo cliente_id deve ser texto se fornecido.' })
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

    let objetivo = 'Não especificado'

    if (!etapa_id && cliente_id) {
      try {
        const planos = $app.findRecordsByFilter(
          'planos',
          `cliente_id = "${cliente_id}" && status != "concluido"`,
          '-created',
          1,
          0,
        )
        if (planos.length > 0) {
          const etapas = $app.findRecordsByFilter(
            'etapas',
            `plano_id = "${planos[0].id}"`,
            'ordem',
            1,
            0,
          )
          if (etapas.length > 0) {
            etapa_id = etapas[0].id
          } else {
            const etapa = new Record($app.findCollectionByNameOrId('etapas'))
            etapa.set('plano_id', planos[0].id)
            etapa.set('titulo', 'Discovery')
            etapa.set('descricao', 'Etapa inicial criada automaticamente.')
            etapa.set('status', 'a_fazer')
            etapa.set('ordem', 1)
            $app.save(etapa)
            etapa_id = etapa.id
          }
        }
      } catch (err) {
        $app.logger().error('Erro ao buscar ou criar etapa inicial', 'erro', err.message)
      }
    }

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
        url: `https://pasta.tldv.io/v1alpha1/meetings/${tldv_meeting_id}`,
        method: 'GET',
        headers: {
          'x-api-key': tldvKey,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (metaRes.statusCode === 401 || metaRes.statusCode === 403)
        return e.json(401, { error: 'Erro de autenticação com TLDV.' })
      if (metaRes.statusCode === 404) return e.json(404, { error: 'Reunião não encontrada.' })

      if (metaRes.statusCode === 200 && metaRes.json) {
        if (metaRes.json.happenedAt) meetingDate = metaRes.json.happenedAt
        else if (metaRes.json.created_at) meetingDate = metaRes.json.created_at
        else if (metaRes.json.date) meetingDate = metaRes.json.date
      }
    } catch (err) {
      $app.logger().error('Erro ao buscar metadados do TLDV', 'erro', err.message)
    }

    let transcriptText = ''
    try {
      const transRes = $http.send({
        url: `https://pasta.tldv.io/v1alpha1/meetings/${tldv_meeting_id}/transcript`,
        method: 'GET',
        headers: {
          'x-api-key': tldvKey,
          'Content-Type': 'application/json',
        },
        timeout: 30,
      })

      if (transRes.statusCode === 401 || transRes.statusCode === 403)
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

    const openaiKey = $secrets.get('API_OPENAI')
    if (!openaiKey) {
      $app.logger().error('Chave API_OPENAI não configurada.')
      return e.json(500, { error: 'Chave API_OPENAI não configurada.' })
    }

    let retries = [2000, 4000, 8000]
    let aiResult = null
    let attempt = 0
    let aiErrorMsg = ''

    while (attempt <= retries.length) {
      try {
        const prompt = `Objetivo da etapa: ${objetivo}\n\nTranscrição da reunião:\n${transcriptText.substring(0, 150000)}\n\nExtraia as ações e tarefas que precisam ser feitas. Retorne APENAS um objeto JSON válido, sem texto adicional, com a seguinte estrutura:
{
  "tarefas": [
    {
      "titulo": "Título curto da tarefa",
      "o_que_foi_feito": "O que precisa ser feito de forma detalhada",
      "passos_seguidos": "Passos sugeridos ou como executar"
    }
  ]
}`
        const openAiRes = $http.send({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
          }),
          timeout: 120,
        })

        if (openAiRes.statusCode >= 200 && openAiRes.statusCode < 300) {
          aiResult = openAiRes.json.choices[0].message.content
          break
        } else {
          const status = openAiRes.statusCode
          if (status === 502 || status === 503) {
            throw new Error(`HTTP ${status}`)
          } else if (status >= 400 && status < 500) {
            aiErrorMsg = `Erro na API OpenAI: ${status}`
            $app
              .logger()
              .error(
                'Erro OpenAI 4xx',
                'status',
                status,
                'response',
                JSON.stringify(openAiRes.json || {}),
              )
            break
          } else {
            throw new Error(`HTTP ${status}`)
          }
        }
      } catch (err) {
        let isRetryable = true

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
        tarefas: [
          {
            titulo: 'Resumo e Ações da Reunião',
            o_que_foi_feito: aiResult,
            passos_seguidos: 'Revisar a transcrição importada.',
          },
        ],
      }
    }

    let createdCount = 0
    if (etapa_id) {
      const tarefas = parsedResult.tarefas || []
      const collection = $app.findCollectionByNameOrId('cards_execucao')

      $app.runInTransaction((txApp) => {
        for (const t of tarefas) {
          try {
            const card = new Record(collection)
            card.set('etapa_id', etapa_id)
            const oQue = t.titulo
              ? t.titulo + '\n\n' + (t.o_que_foi_feito || '')
              : t.o_que_foi_feito || 'Nova tarefa'
            card.set('o_que_foi_feito', oQue.trim())
            card.set('passos_seguidos', t.passos_seguidos || '')
            card.set('como_foi_executado', 'Gerado automaticamente por IA a partir do TLDV')
            card.set('quando_foi_executado', '')
            card.set('responsavel', '')
            txApp.save(card)
            createdCount++
          } catch (err) {
            $app.logger().error('Erro ao salvar card de execução', 'erro', err.message)
          }
        }
      })
    }

    return e.json(200, {
      message: `Importação concluída. ${createdCount} tarefas adicionadas.`,
      createdCount,
    })
  },
  $apis.requireAuth(),
)
