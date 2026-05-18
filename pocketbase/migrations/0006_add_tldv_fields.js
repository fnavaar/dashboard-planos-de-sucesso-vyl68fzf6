migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')

    if (!col.fields.getByName('tldv_meeting_id')) {
      col.fields.add(new TextField({ name: 'tldv_meeting_id' }))
    }

    if (!col.fields.getByName('kickoff_transcript')) {
      col.fields.add(new TextField({ name: 'kickoff_transcript' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    col.fields.removeByName('tldv_meeting_id')
    col.fields.removeByName('kickoff_transcript')
    app.save(col)
  },
)
