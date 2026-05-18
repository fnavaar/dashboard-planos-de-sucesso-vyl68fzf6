migrate(
  (app) => {
    const collection = new Collection({
      name: 'clients',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'goal', type: 'text', required: true },
        { name: 'context', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['Ativo', 'Pausado', 'Concluído'],
          required: true,
        },
        { name: 'start_date', type: 'date', required: true },
        { name: 'progress', type: 'number', min: 0, max: 100, required: true },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clients_name ON clients (name)',
        'CREATE INDEX idx_clients_status ON clients (status)',
        'CREATE INDEX idx_clients_user_id ON clients (user_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('clients')
    app.delete(collection)
  },
)
