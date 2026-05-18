migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'navaar@adapta.org')
    } catch (_) {
      user = new Record(users)
      user.setEmail('navaar@adapta.org')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Admin')
      app.save(user)
    }

    const clients = app.findCollectionByNameOrId('clients')

    const sampleClients = [
      {
        name: 'Arthur Pendragon',
        goal: 'Reclaiming Excalibur',
        context: 'Needs to pull the sword from the stone.',
        status: 'Ativo',
        progress: 45,
        start_date: '2024-01-01 10:00:00.000Z',
      },
      {
        name: 'Morgana Le Fay',
        goal: 'Mastering Arcane Arts',
        context: 'Studying under Merlin.',
        status: 'Pausado',
        progress: 20,
        start_date: '2024-02-15 10:00:00.000Z',
      },
      {
        name: 'Merlin Ambrosius',
        goal: 'Guiding the King',
        context: 'Providing counsel and magic.',
        status: 'Concluído',
        progress: 100,
        start_date: '2023-11-01 10:00:00.000Z',
      },
    ]

    for (const c of sampleClients) {
      try {
        app.findFirstRecordByData('clients', 'name', c.name)
      } catch (_) {
        const record = new Record(clients)
        record.set('name', c.name)
        record.set('goal', c.goal)
        record.set('context', c.context)
        record.set('status', c.status)
        record.set('progress', c.progress)
        record.set('start_date', c.start_date)
        record.set('user_id', user.id)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'navaar@adapta.org')
      const clients = app.findRecordsByFilter('clients', `user_id = '${user.id}'`, '', 100, 0)
      for (const c of clients) {
        app.delete(c)
      }
    } catch (_) {}
  },
)
