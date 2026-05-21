/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('etapas')
    col.addIndex('idx_etapas_ordem', false, 'ordem', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('etapas')
    col.removeIndex('idx_etapas_ordem')
    app.save(col)
  },
)
