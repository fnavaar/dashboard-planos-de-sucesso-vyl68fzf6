onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = e.record.original()

  if (record.getString('status') === 'concluido' && original.getString('status') !== 'concluido') {
    try {
      const planoId = record.getString('plano_id')
      if (!planoId) return e.next()

      const plano = $app.findRecordById('planos', planoId)
      const clienteId = plano.getString('cliente_id')
      if (!clienteId) return e.next()

      const cliente = $app.findRecordById('clientes', clienteId)

      const clienteNome = cliente.getString('nome') || 'Desconhecido'
      const etapaTitulo = record.getString('titulo') || 'Sem título'

      let oQueFoiFeito = 'Nenhum detalhe fornecido'
      let passosSeguidos = 'Nenhum passo fornecido'

      try {
        const cards = $app.findRecordsByFilter(
          'cards_execucao',
          `etapa_id = '${record.id}'`,
          '',
          10000,
          0,
        )
        if (cards && cards.length > 0) {
          const feitos = []
          const passos = []
          for (let i = 0; i < cards.length; i++) {
            const f = cards[i].getString('o_que_foi_feito')
            if (f) feitos.push(f)
            const p = cards[i].getString('passos_seguidos')
            if (p) passos.push(p)
          }
          if (feitos.length > 0) oQueFoiFeito = feitos.join(', ')
          if (passos.length > 0) passosSeguidos = passos.join('\n')
        }
      } catch (errCard) {
        $app.logger().warn('Error fetching cards for slack', 'error', errCard.message)
      }

      const link = `https://dashboard-planos-de-sucesso-5bf75.goskip.app/cliente/${cliente.id}`
      const text = `*✅ Etapa Finalizada:* ${etapaTitulo}\n*Cliente:* ${clienteNome}\n*Resumo da Execução:* ${oQueFoiFeito}\n*Passos Realizados:* ${passosSeguidos}\n*Link de Acesso:* ${link}`

      const payload = {
        channel: $os.getenv('SLACK_CHANNEL') || '#planos-sucesso',
        text: text,
      }

      const token = $secrets.get('SLACK_ACCESS_TOKEN') || $secrets.get('SLACK_ACCESSS_TOKEN') || ''
      if (!token) {
        $app.logger().warn('Slack token not configured, skipping notification.')
        return e.next()
      }

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

      if (res.statusCode >= 400) {
        $app.logger().warn('Slack API returned non-2xx', 'status', res.statusCode)
      }
    } catch (err) {
      $app.logger().error('Error sending slack notification', 'error', err.message)
    }
  }
  return e.next()
}, 'etapas')
