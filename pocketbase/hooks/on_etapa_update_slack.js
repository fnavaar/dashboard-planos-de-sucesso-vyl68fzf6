onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = e.record.original()

  if (record.getString('status') === 'concluido' && original.getString('status') !== 'concluido') {
    try {
      const plano = $app.findRecordById('planos', record.getString('plano_id'))
      const cliente = $app.findRecordById('clientes', plano.getString('cliente_id'))

      const clienteNome = cliente.getString('nome')
      const etapaTitulo = record.getString('titulo')

      const payload = {
        channel: $os.getenv('SLACK_CHANNEL') || '#planos-sucesso',
        text: `✅ Etapa concluída! A etapa *${etapaTitulo}* do cliente *${clienteNome}* foi finalizada.`,
      }

      const token = $secrets.get('SLACK_ACCESS_TOKEN') || ''
      if (!token) return e.next()

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
