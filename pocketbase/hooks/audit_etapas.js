onRecordAfterUpdateSuccess((e) => {
  const userId = e.requestInfo().auth?.id
  if (!userId) return e.next()

  const orig = e.record.original()
  const current = e.record

  if (orig.getString('status') === current.getString('status')) return e.next()

  const histCol = $app.findCollectionByNameOrId('historico_acoes')
  const log = new Record(histCol)
  log.set('user_id', userId)
  log.set('tabela', 'etapas')
  log.set('registro_id', current.id)
  log.set('acao', 'update')
  log.set('dados_antes', { status: orig.getString('status') })
  log.set('dados_depois', { status: current.getString('status') })

  $app.save(log)
  return e.next()
}, 'etapas')
