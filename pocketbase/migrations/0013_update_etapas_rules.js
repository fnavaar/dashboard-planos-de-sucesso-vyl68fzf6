migrate(
  (app) => {
    const etapas = app.findCollectionByNameOrId('etapas')
    etapas.createRule = "@request.auth.role = 'admin'"
    etapas.deleteRule = "@request.auth.role = 'admin'"
    etapas.updateRule =
      "@request.auth.role = 'admin' || (plano_id.cliente_id.user_id = @request.auth.id && @request.body.status != 'concluido')"
    app.save(etapas)

    const cards = app.findCollectionByNameOrId('cards_execucao')
    cards.updateRule =
      "@request.auth.role = 'admin' || (etapa_id.plano_id.cliente_id.user_id = @request.auth.id && etapa_id.status != 'concluido')"
    if (!cards.fields.getByName('feedback_admin')) {
      cards.fields.add(new TextField({ name: 'feedback_admin' }))
    }
    app.save(cards)
  },
  (app) => {
    const etapas = app.findCollectionByNameOrId('etapas')
    etapas.createRule = "@request.auth.id != ''"
    etapas.deleteRule =
      "@request.auth.id != '' && (plano_id.cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    etapas.updateRule =
      "@request.auth.id != '' && (plano_id.cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    app.save(etapas)

    const cards = app.findCollectionByNameOrId('cards_execucao')
    cards.updateRule =
      "@request.auth.id != '' && (etapa_id.plano_id.cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    app.save(cards)
  },
)
