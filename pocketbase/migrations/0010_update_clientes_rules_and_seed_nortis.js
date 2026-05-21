migrate(
  (app) => {
    // Update rules for clientes to allow admins to see and manage all clients
    const ruleClientes =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'admin')"
    const clientes = app.findCollectionByNameOrId('clientes')
    clientes.listRule = ruleClientes
    clientes.viewRule = ruleClientes
    clientes.updateRule = ruleClientes
    clientes.deleteRule = ruleClientes
    app.save(clientes)

    // Update rules for related collections
    const rulePlanos =
      "@request.auth.id != '' && (cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    const planos = app.findCollectionByNameOrId('planos')
    planos.listRule = rulePlanos
    planos.viewRule = rulePlanos
    planos.updateRule = rulePlanos
    planos.deleteRule = rulePlanos
    app.save(planos)

    const ruleEtapas =
      "@request.auth.id != '' && (plano_id.cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    const etapas = app.findCollectionByNameOrId('etapas')
    etapas.listRule = ruleEtapas
    etapas.viewRule = ruleEtapas
    etapas.updateRule = ruleEtapas
    etapas.deleteRule = ruleEtapas
    app.save(etapas)

    const ruleCards =
      "@request.auth.id != '' && (etapa_id.plano_id.cliente_id.user_id = @request.auth.id || @request.auth.role = 'admin')"
    const cards = app.findCollectionByNameOrId('cards_execucao')
    cards.listRule = ruleCards
    cards.viewRule = ruleCards
    cards.updateRule = ruleCards
    cards.deleteRule = ruleCards
    app.save(cards)

    const ruleHist =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'admin')"
    const historico = app.findCollectionByNameOrId('historico_acoes')
    historico.listRule = ruleHist
    historico.viewRule = ruleHist
    app.save(historico)

    // Seed Nortis user and client if it doesn't exist
    const users = app.findCollectionByNameOrId('users')
    let userId
    try {
      const existingUser = app.findAuthRecordByEmail('users', 'cspindola@gruponortis.com.br')
      userId = existingUser.id
    } catch (_) {
      const newUser = new Record(users)
      newUser.setEmail('cspindola@gruponortis.com.br')
      newUser.setPassword('Skip@Pass123')
      newUser.setVerified(true)
      newUser.set('name', 'Nortis')
      newUser.set('role', 'user')
      app.save(newUser)
      userId = newUser.id
    }

    try {
      app.findFirstRecordByData('clientes', 'user_id', userId)
    } catch (_) {
      const newCliente = new Record(clientes)
      newCliente.set('user_id', userId)
      newCliente.set('nome', 'Nortis')
      newCliente.set('objetivo_principal', 'Aumentar engajamento e resultados')
      newCliente.set('contexto', 'Cliente estratégico - Nortis')
      newCliente.set('status', 'ativo')
      newCliente.set('progresso', 0)
      newCliente.set('data_inicio', new Date().toISOString())
      app.save(newCliente)
    }
  },
  (app) => {
    // Revert rules to old state
    const ruleClientes = "@request.auth.id != '' && user_id = @request.auth.id"
    const clientes = app.findCollectionByNameOrId('clientes')
    clientes.listRule = ruleClientes
    clientes.viewRule = ruleClientes
    clientes.updateRule = ruleClientes
    clientes.deleteRule = ruleClientes
    app.save(clientes)

    const rulePlanos = "@request.auth.id != '' && cliente_id.user_id = @request.auth.id"
    const planos = app.findCollectionByNameOrId('planos')
    planos.listRule = rulePlanos
    planos.viewRule = rulePlanos
    planos.updateRule = rulePlanos
    planos.deleteRule = rulePlanos
    app.save(planos)

    const ruleEtapas = "@request.auth.id != '' && plano_id.cliente_id.user_id = @request.auth.id"
    const etapas = app.findCollectionByNameOrId('etapas')
    etapas.listRule = ruleEtapas
    etapas.viewRule = ruleEtapas
    etapas.updateRule = ruleEtapas
    etapas.deleteRule = ruleEtapas
    app.save(etapas)

    const ruleCards =
      "@request.auth.id != '' && etapa_id.plano_id.cliente_id.user_id = @request.auth.id"
    const cards = app.findCollectionByNameOrId('cards_execucao')
    cards.listRule = ruleCards
    cards.viewRule = ruleCards
    cards.updateRule = ruleCards
    cards.deleteRule = ruleCards
    app.save(cards)

    const ruleHist = "@request.auth.id != '' && user_id = @request.auth.id"
    const historico = app.findCollectionByNameOrId('historico_acoes')
    historico.listRule = ruleHist
    historico.viewRule = ruleHist
    app.save(historico)
  },
)
