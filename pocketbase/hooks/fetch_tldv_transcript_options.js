routerAdd('OPTIONS', '/backend/v1/fetch-tldv-transcript', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'Authorization, apikey, content-type')
  return e.noContent(204)
})
