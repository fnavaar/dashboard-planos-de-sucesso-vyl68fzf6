migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    const field = col.fields.getByName('kickoff_transcript')
    if (field) {
      field.max = 100000
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    const field = col.fields.getByName('kickoff_transcript')
    if (field) {
      field.max = 5000
      app.save(col)
    }
  },
)
