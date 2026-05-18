migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(new SelectField({ name: 'role', values: ['admin', 'user'], maxSelect: 1 }))
      app.save(users)
    }

    try {
      const oldClients = app.findCollectionByNameOrId('clients')
      app.delete(oldClients)
    } catch (_) {}

    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'objetivo_principal', type: 'text' },
        { name: 'contexto', type: 'text' },
        { name: 'status', type: 'select', values: ['ativo', 'pausado', 'concluido'], maxSelect: 1 },
        { name: 'data_inicio', type: 'date' },
        { name: 'progresso', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_clientes_user_id ON clientes (user_id)'],
    })
    app.save(clientes)

    const planos = new Collection({
      name: 'planos',
      type: 'base',
      listRule: "@request.auth.id != '' && cliente_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && cliente_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && cliente_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && cliente_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['rascunho', 'ativo', 'concluido'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(planos)

    const etapas = new Collection({
      name: 'etapas',
      type: 'base',
      listRule: "@request.auth.id != '' && plano_id.cliente_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && plano_id.cliente_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && plano_id.cliente_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && plano_id.cliente_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'plano_id',
          type: 'relation',
          required: true,
          collectionId: planos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'objetivo', type: 'text' },
        { name: 'tempo_estimado', type: 'text' },
        { name: 'ordem', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['a_fazer', 'em_progresso', 'concluido'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(etapas)

    const cards = new Collection({
      name: 'cards_execucao',
      type: 'base',
      listRule: "@request.auth.id != '' && etapa_id.plano_id.cliente_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && etapa_id.plano_id.cliente_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && etapa_id.plano_id.cliente_id.user_id = @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && etapa_id.plano_id.cliente_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'etapa_id',
          type: 'relation',
          required: true,
          collectionId: etapas.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'o_que_foi_feito', type: 'text' },
        { name: 'passos_seguidos', type: 'text' },
        { name: 'como_foi_executado', type: 'text' },
        { name: 'quando_foi_executado', type: 'date' },
        { name: 'responsavel', type: 'text' },
        { name: 'anexos', type: 'json', maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cards)

    const historico = new Collection({
      name: 'historico_acoes',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'tabela', type: 'text' },
        { name: 'registro_id', type: 'text' },
        { name: 'acao', type: 'select', values: ['create', 'update', 'delete'], maxSelect: 1 },
        { name: 'dados_antes', type: 'json', maxSize: 5242880 },
        { name: 'dados_depois', type: 'json', maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(historico)
  },
  (app) => {
    const cNames = ['historico_acoes', 'cards_execucao', 'etapas', 'planos', 'clientes']
    for (const n of cNames) {
      try {
        const col = app.findCollectionByNameOrId(n)
        app.delete(col)
      } catch (_) {}
    }
  },
)
