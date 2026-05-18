migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const ensureUser = (email, password, name, role) => {
      try {
        return app.findAuthRecordByEmail('_pb_users_auth_', email)
      } catch (_) {
        const record = new Record(users)
        record.setEmail(email)
        record.setPassword(password)
        record.setVerified(true)
        record.set('name', name)
        record.set('role', role)
        app.save(record)
        return record
      }
    }

    const admin = ensureUser('navaar@adapta.org', 'senha123', 'Navaar', 'admin')
    const user = ensureUser('bebel@adapta.org', 'senha123', 'Bebel', 'user')

    const clientes = app.findCollectionByNameOrId('clientes')

    const ensureCliente = (nome, user_id, objetivo, contexto, status, data, progresso) => {
      try {
        return app.findFirstRecordByData('clientes', 'nome', nome)
      } catch (_) {
        const record = new Record(clientes)
        record.set('user_id', user_id)
        record.set('nome', nome)
        record.set('objetivo_principal', objetivo)
        record.set('contexto', contexto)
        record.set('status', status)
        record.set('data_inicio', data)
        record.set('progresso', progresso)
        app.save(record)
        return record
      }
    }

    ensureCliente(
      'Tech Corp',
      admin.id,
      'Aumentar MRR em 20%',
      'Empresa de SaaS B2B buscando otimização no funil de vendas.',
      'ativo',
      '2026-01-10 10:00:00.000Z',
      45,
    )
    ensureCliente(
      'Varejo Plus',
      admin.id,
      'Otimizar logística de entrega',
      'Rede de varejo com 50 lojas enfrentando problemas de atrasos nas entregas online.',
      'pausado',
      '2026-02-15 10:00:00.000Z',
      10,
    )
    ensureCliente(
      'Educa EAD',
      user.id,
      'Lançar 5 novos cursos de tecnologia',
      'Plataforma de cursos online expandindo para a área de programação.',
      'concluido',
      '2026-03-01 10:00:00.000Z',
      100,
    )
  },
  (app) => {
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'navaar@adapta.org')
      app.delete(admin)
    } catch (_) {}
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'bebel@adapta.org')
      app.delete(user)
    } catch (_) {}
  },
)
