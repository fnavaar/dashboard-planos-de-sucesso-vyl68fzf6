onRecordAfterCreateSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 0, 0)
      } catch (err) {
        // Ignora se não achar cards
      }

      if (cards.length > 0) {
        let cardsConcluidos = 0
        cards.forEach((c) => {
          if (c.getString('quando_foi_executado')) cardsConcluidos++
        })
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        allEtapas.forEach((step) => {
          if (step.getString('status') === 'concluido') etapasConcluidas++
        })
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress', err.message)
  }
  return e.next()
}, 'etapas')

onRecordAfterUpdateSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 0, 0)
      } catch (err) {
        // Ignora se não achar cards
      }

      if (cards.length > 0) {
        let cardsConcluidos = 0
        cards.forEach((c) => {
          if (c.getString('quando_foi_executado')) cardsConcluidos++
        })
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        allEtapas.forEach((step) => {
          if (step.getString('status') === 'concluido') etapasConcluidas++
        })
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress', err.message)
  }
  return e.next()
}, 'etapas')

onRecordAfterDeleteSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 0, 0)
      } catch (err) {
        // Ignora se não achar cards
      }

      if (cards.length > 0) {
        let cardsConcluidos = 0
        cards.forEach((c) => {
          if (c.getString('quando_foi_executado')) cardsConcluidos++
        })
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        allEtapas.forEach((step) => {
          if (step.getString('status') === 'concluido') etapasConcluidas++
        })
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress', err.message)
  }
  return e.next()
}, 'etapas')

onRecordAfterCreateSuccess((e) => {
  try {
    const etapa = $app.findRecordById('etapas', e.record.getString('etapa_id'))
    const planoId = etapa.getString('plano_id')

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 0, 0)
      } catch (err2) {}

      if (cards.length > 0) {
        let cardsConcluidos = 0
        cards.forEach((c) => {
          if (c.getString('quando_foi_executado')) cardsConcluidos++
        })
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        allEtapas.forEach((step) => {
          if (step.getString('status') === 'concluido') etapasConcluidas++
        })
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {}
  return e.next()
}, 'cards_execucao')

onRecordAfterUpdateSuccess((e) => {
  try {
    const etapa = $app.findRecordById('etapas', e.record.getString('etapa_id'))
    const planoId = etapa.getString('plano_id')

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 0, 0)
      } catch (err2) {}

      if (cards.length > 0) {
        let cardsConcluidos = 0
        cards.forEach((c) => {
          if (c.getString('quando_foi_executado')) cardsConcluidos++
        })
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        allEtapas.forEach((step) => {
          if (step.getString('status') === 'concluido') etapasConcluidas++
        })
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {}
  return e.next()
}, 'cards_execucao')

onRecordAfterDeleteSuccess((e) => {
  try {
    const etapa = $app.findRecordById('etapas', e.record.getString('etapa_id'))
    const planoId = etapa.getString('plano_id')

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 0, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 0, 0)
      } catch (err2) {}

      if (cards.length > 0) {
        let cardsConcluidos = 0
        cards.forEach((c) => {
          if (c.getString('quando_foi_executado')) cardsConcluidos++
        })
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        allEtapas.forEach((step) => {
          if (step.getString('status') === 'concluido') etapasConcluidas++
        })
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {}
  return e.next()
}, 'cards_execucao')
