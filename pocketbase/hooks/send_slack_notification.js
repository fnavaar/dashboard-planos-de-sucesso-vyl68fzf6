routerAdd('OPTIONS', '/backend/v1/sendSlackNotification', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'authorization, apikey, content-type')
  return e.noContent(204)
})

routerAdd(
  'POST',
  '/backend/v1/sendSlackNotification',
  (e) => {
    const body = e.requestInfo().body || {}
    const { etapa_id, acao, responsavel, cliente_nome } = body

    if (!etapa_id || !acao || !responsavel || !cliente_nome) {
      return e.json(400, {
        error: 'Os campos etapa_id, acao, responsavel e cliente_nome são obrigatórios.',
      })
    }

    if (!['concluida', 'iniciada', 'atrasada'].includes(acao)) {
      return e.json(400, { error: "Ação inválida. Use 'concluida', 'iniciada' ou 'atrasada'." })
    }

    let etapa, plano, cliente
    try {
      etapa = $app.findRecordById('etapas', etapa_id)
      plano = $app.findRecordById('planos', etapa.getString('plano_id'))
      cliente = $app.findRecordById('clientes', plano.getString('cliente_id'))
    } catch (err) {
      return e.json(404, { error: 'Etapa não encontrada.' })
    }

    if (cliente.getString('user_id') !== e.auth?.id) {
      return e.json(403, { error: 'Você não tem permissão para acessar esta etapa.' })
    }

    let proxima_etapa = 'Nenhuma'
    try {
      const etapas = $app.findRecordsByFilter(
        'etapas',
        `plano_id = '${etapa.getString('plano_id')}' && ordem > ${etapa.getInt('ordem')}`,
        'ordem',
        1,
        0,
      )
      if (etapas.length > 0) {
        proxima_etapa = etapas[0].getString('titulo')
      }
    } catch (err) {}

    const titulo = etapa.getString('titulo')
    const url = `https://dashboard-planos-de-sucesso-5bf75.goskip.app/cliente/${cliente.id}`
    let text = ''

    if (acao === 'concluida') {
      text = `✅ Etapa concluída! *${titulo}* foi finalizada por *${responsavel}* no cliente *${cliente_nome}*. Próxima etapa: ${proxima_etapa}\n🔗 <${url}|Ver cliente>`
    } else if (acao === 'iniciada') {
      text = `🚀 Etapa iniciada! *${titulo}* foi começada por *${responsavel}* no cliente *${cliente_nome}*.\n🔗 <${url}|Ver cliente>`
    } else if (acao === 'atrasada') {
      const createdStr = etapa.getString('created')
      const createdDate = new Date(createdStr.replace(' ', 'T'))
      const now = new Date()
      const diff = Math.max(0, now - createdDate)
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
      text = `⚠️ Etapa atrasada! *${titulo}* no cliente *${cliente_nome}* está pendente há ${dias} dias.\n🔗 <${url}|Ver cliente>`
    }

    const payload = {
      channel: $os.getenv('SLACK_CHANNEL') || '#planos-sucesso',
      text: text,
    }

    const token = $secrets.get('SLACK_ACCESS_TOKEN') || $secrets.get('SLACK_ACCESSS_TOKEN') || ''
    if (!token) {
      $app.logger().error('Slack token not found')
      return e.json(200, {
        data: { message_ts: null, channel: payload.channel, warning: 'Slack token not configured' },
      })
    }

    const sleep = (ms) => {
      const end = Date.now() + ms
      while (Date.now() < end) {}
    }

    const delays = [2000, 4000, 8000]
    let attempt = 0

    while (attempt <= delays.length) {
      try {
        const res = $http.send({
          url: 'https://slack.com/api/chat.postMessage',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
          timeout: 10,
        })

        if (res.statusCode === 200) {
          const data = res.json || {}
          if (!data.ok) {
            if (
              data.error === 'invalid_auth' ||
              data.error === 'account_inactive' ||
              data.error === 'not_authed'
            ) {
              $app.logger().error('Slack auth failed', 'error', data.error)
              return e.json(200, {
                data: { message_ts: null, channel: payload.channel, warning: 'Slack auth failed' },
              })
            }
            $app.logger().error('Slack error', 'error', data.error)
            return e.json(500, { error: 'Erro ao enviar notificação para o Slack: ' + data.error })
          }
          return e.json(200, { data: { message_ts: data.ts, channel: data.channel } })
        }

        if (res.statusCode === 503 || res.statusCode === 429) {
          if (attempt < delays.length) {
            $app
              .logger()
              .warn(
                'Slack temporarily unavailable, retrying',
                'attempt',
                attempt + 1,
                'status',
                res.statusCode,
              )
            sleep(delays[attempt])
            attempt++
            continue
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          $app.logger().error('Slack auth failed via HTTP status', 'status', res.statusCode)
          return e.json(200, {
            data: { message_ts: null, channel: payload.channel, warning: 'Slack auth failed' },
          })
        }

        $app.logger().error('Slack request failed', 'status', res.statusCode)
        return e.json(500, { error: 'Erro na comunicação com o Slack. Status: ' + res.statusCode })
      } catch (err) {
        $app.logger().error('Slack request network error', 'message', err.message)
        if (attempt < delays.length) {
          sleep(delays[attempt])
          attempt++
          continue
        }
        return e.json(500, { error: 'Erro de rede ao comunicar com o Slack.' })
      }
    }

    return e.json(500, { error: 'Falha ao enviar notificação após tentativas.' })
  },
  $apis.requireAuth(),
)
