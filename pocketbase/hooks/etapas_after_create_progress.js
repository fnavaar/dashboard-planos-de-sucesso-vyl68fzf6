onRecordAfterCreateSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    if (!planoId) return e.next()

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const etapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)

    let total = etapas.length
    let concluidos = 0

    for (let i = 0; i < total; i++) {
      if (etapas[i].getString('status') === 'concluido') {
        concluidos++
      }
    }

    const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progresso) {
      cliente.set('progresso', progresso)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating client progress on create', 'error', err.message)
  }
  return e.next()
}, 'etapas')
