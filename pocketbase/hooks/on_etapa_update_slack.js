onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = e.record.original()

  if (record.getString('status') === 'concluido' && original.getString('status') !== 'concluido') {
    try {
      const plano = $app.findRecordById('planos', record.getString('plano_id'))
      const cliente = $app.findRecordById('clientes', plano.getString('cliente_id'))

      const clienteNome = cliente.getString('nome')
      const etapaTitulo = record.getString('titulo')

      let oQueFoiFeito = 'Nenhum detalhe fornecido'
      let passosSeguidos = 'Nenhum passo fornecido'

      try {
        const card = $app.findFirstRecordByData('cards_execucao', 'etapa_id', record.id)
        if (card.getString('o_que_foi_feito')) {
          oQueFoiFeito = card.getString('o_que_foi_feito')
        }
        if (card.getString('passos_seguidos')) {
          passosSeguidos = card.getString('passos_seguidos')
        }
      } catch (_) {
        // No execution card found, fallback to defaults
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

      $http.send({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
        timeout: 10,
      })
    } catch (err) {
      $app.logger().error('Error sending slack notification', err.message)
    }
  }
  return e.next()
}, 'etapas')
