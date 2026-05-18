onRecordAfterUpdateSuccess(
  (e) => {
    const collectionName = e.record.collection().name
    let userId = null
    try {
      if (collectionName === 'clientes') {
        userId = e.record.get('user_id')
      } else if (collectionName === 'planos') {
        const cliente = $app.findRecordById('clientes', e.record.get('cliente_id'))
        userId = cliente.get('user_id')
      } else if (collectionName === 'etapas') {
        const plano = $app.findRecordById('planos', e.record.get('plano_id'))
        const cliente = $app.findRecordById('clientes', plano.get('cliente_id'))
        userId = cliente.get('user_id')
      } else if (collectionName === 'cards_execucao') {
        const etapa = $app.findRecordById('etapas', e.record.get('etapa_id'))
        const plano = $app.findRecordById('planos', etapa.get('plano_id'))
        const cliente = $app.findRecordById('clientes', plano.get('cliente_id'))
        userId = cliente.get('user_id')
      }
    } catch (err) {}

    if (userId) {
      try {
        const histCol = $app.findCollectionByNameOrId('historico_acoes')
        const histRecord = new Record(histCol)
        histRecord.set('user_id', userId)
        histRecord.set('tabela', collectionName)
        histRecord.set('registro_id', e.record.id)
        histRecord.set('acao', 'update')
        histRecord.set('dados_antes', JSON.parse(JSON.stringify(e.record.original())))
        histRecord.set('dados_depois', JSON.parse(JSON.stringify(e.record)))
        $app.saveNoValidate(histRecord)
      } catch (err) {}
    }
    e.next()
  },
  'clientes',
  'planos',
  'etapas',
  'cards_execucao',
)
