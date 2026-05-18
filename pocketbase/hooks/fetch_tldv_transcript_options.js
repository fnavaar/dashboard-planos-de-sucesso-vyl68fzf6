routerAdd('OPTIONS', '/backend/v1/fetchTLDVTranscript', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'Authorization, apikey, content-type')
  return e.noContent(204)
})
