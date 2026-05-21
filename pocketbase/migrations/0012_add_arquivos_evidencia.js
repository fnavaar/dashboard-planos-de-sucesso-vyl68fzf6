migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards_execucao')
    col.fields.add(
      new FileField({
        name: 'arquivos_evidencia',
        maxSelect: 10,
        maxSize: 5242880,
        mimeTypes: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards_execucao')
    col.fields.removeByName('arquivos_evidencia')
    app.save(col)
  },
)
