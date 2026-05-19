onRecordUpdateRequest((e) => {
  const userId = e.auth?.id
  if (!userId) return e.next()

  const origStatus = e.record.original().getString('status')

  e.next()

  const newStatus = e.record.getString('status')
  if (origStatus !== newStatus) {
    try {
      const histCol = $app.findCollectionByNameOrId('historico_acoes')
      const log = new Record(histCol)
      log.set('user_id', userId)
      log.set('tabela', 'etapas')
      log.set('registro_id', e.record.id)
      log.set('acao', 'update')
      log.set('dados_antes', { status: origStatus })
      log.set('dados_depois', { status: newStatus })
      $app.saveNoValidate(log)
    } catch (err) {
      $app.logger().error('Error saving audit log for etapas update', 'error', err.message)
    }
  }
}, 'etapas')
