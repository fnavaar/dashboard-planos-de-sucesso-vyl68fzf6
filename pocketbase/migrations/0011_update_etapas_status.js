/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('etapas')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['a_fazer', 'em_progresso', 'aguardando_aprovacao', 'concluido']
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('etapas')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['a_fazer', 'em_progresso', 'concluido']
      app.save(col)
    }
  },
)
