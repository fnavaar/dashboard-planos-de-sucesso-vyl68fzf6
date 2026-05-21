migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    clientes.createRule = "@request.auth.role = 'admin'"
    clientes.deleteRule = "@request.auth.role = 'admin'"
    app.save(clientes)

    const planos = app.findCollectionByNameOrId('planos')
    planos.createRule = "@request.auth.role = 'admin'"
    planos.deleteRule = "@request.auth.role = 'admin'"
    app.save(planos)
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    clientes.createRule = "@request.auth.id != ''"
    clientes.deleteRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'admin')"
    app.save(clientes)

    const planos = app.findCollectionByNameOrId('planos')
    planos.createRule = "@request.auth.id != ''"
    planos.deleteRule =
      "@request.auth.id != '' && (cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    app.save(planos)
  },
)
