migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.createRule = "@request.auth.role = 'admin'"
    col.listRule = "id = @request.auth.id || @request.auth.role = 'admin'"
    col.viewRule = "id = @request.auth.id || @request.auth.role = 'admin'"
    app.save(col)

    try {
      const adminUser = app.findAuthRecordByEmail('users', 'navaar@adapta.org')
      adminUser.set('role', 'admin')
      app.save(adminUser)
    } catch (_) {
      // skip if not found
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.createRule = ''
    col.listRule = 'id = @request.auth.id'
    col.viewRule = 'id = @request.auth.id'
    app.save(col)
  },
)
