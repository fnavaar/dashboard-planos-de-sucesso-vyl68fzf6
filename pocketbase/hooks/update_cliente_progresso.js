onRecordAfterCreateSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    if (!planoId) return e.next()

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 10000, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 10000, 0)
      } catch (err) {
        $app.logger().warn('Error fetching cards for progress: ' + err.message)
      }

      if (cards && cards.length > 0) {
        let cardsConcluidos = 0
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getString('quando_foi_executado')) cardsConcluidos++
        }
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        for (let i = 0; i < allEtapas.length; i++) {
          if (allEtapas[i].getString('status') === 'concluido') etapasConcluidas++
        }
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    if (Number.isNaN(progress)) progress = 0
    progress = Math.min(Math.max(progress, 0), 100)

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress on etapa create', 'error', err.message)
  }
  return e.next()
}, 'etapas')

onRecordAfterUpdateSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    if (!planoId) return e.next()

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 10000, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 10000, 0)
      } catch (err) {
        $app.logger().warn('Error fetching cards for progress: ' + err.message)
      }

      if (cards && cards.length > 0) {
        let cardsConcluidos = 0
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getString('quando_foi_executado')) cardsConcluidos++
        }
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        for (let i = 0; i < allEtapas.length; i++) {
          if (allEtapas[i].getString('status') === 'concluido') etapasConcluidas++
        }
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    if (Number.isNaN(progress)) progress = 0
    progress = Math.min(Math.max(progress, 0), 100)

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress on etapa update', 'error', err.message)
  }
  return e.next()
}, 'etapas')

onRecordAfterDeleteSuccess((e) => {
  try {
    const planoId = e.record.getString('plano_id')
    if (!planoId) return e.next()

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 10000, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 10000, 0)
      } catch (err) {
        $app.logger().warn('Error fetching cards for progress: ' + err.message)
      }

      if (cards && cards.length > 0) {
        let cardsConcluidos = 0
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getString('quando_foi_executado')) cardsConcluidos++
        }
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        for (let i = 0; i < allEtapas.length; i++) {
          if (allEtapas[i].getString('status') === 'concluido') etapasConcluidas++
        }
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    if (Number.isNaN(progress)) progress = 0
    progress = Math.min(Math.max(progress, 0), 100)

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress on etapa delete', 'error', err.message)
  }
  return e.next()
}, 'etapas')

onRecordAfterCreateSuccess((e) => {
  try {
    const etapaId = e.record.getString('etapa_id')
    if (!etapaId) return e.next()

    const etapa = $app.findRecordById('etapas', etapaId)
    const planoId = etapa.getString('plano_id')
    if (!planoId) return e.next()

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 10000, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 10000, 0)
      } catch (err) {
        $app.logger().warn('Error fetching cards for progress: ' + err.message)
      }

      if (cards && cards.length > 0) {
        let cardsConcluidos = 0
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getString('quando_foi_executado')) cardsConcluidos++
        }
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        for (let i = 0; i < allEtapas.length; i++) {
          if (allEtapas[i].getString('status') === 'concluido') etapasConcluidas++
        }
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    if (Number.isNaN(progress)) progress = 0
    progress = Math.min(Math.max(progress, 0), 100)

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress on card create', 'error', err.message)
  }
  return e.next()
}, 'cards_execucao')

onRecordAfterUpdateSuccess((e) => {
  try {
    const etapaId = e.record.getString('etapa_id')
    if (!etapaId) return e.next()

    const etapa = $app.findRecordById('etapas', etapaId)
    const planoId = etapa.getString('plano_id')
    if (!planoId) return e.next()

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 10000, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 10000, 0)
      } catch (err) {
        $app.logger().warn('Error fetching cards for progress: ' + err.message)
      }

      if (cards && cards.length > 0) {
        let cardsConcluidos = 0
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getString('quando_foi_executado')) cardsConcluidos++
        }
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        for (let i = 0; i < allEtapas.length; i++) {
          if (allEtapas[i].getString('status') === 'concluido') etapasConcluidas++
        }
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    if (Number.isNaN(progress)) progress = 0
    progress = Math.min(Math.max(progress, 0), 100)

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress on card update', 'error', err.message)
  }
  return e.next()
}, 'cards_execucao')

onRecordAfterDeleteSuccess((e) => {
  try {
    const etapaId = e.record.getString('etapa_id')
    if (!etapaId) return e.next()

    const etapa = $app.findRecordById('etapas', etapaId)
    const planoId = etapa.getString('plano_id')
    if (!planoId) return e.next()

    const allEtapas = $app.findRecordsByFilter('etapas', `plano_id = '${planoId}'`, '', 10000, 0)
    const etapaIds = allEtapas.map((step) => step.id)

    let progress = 0

    if (etapaIds.length > 0) {
      const filter = etapaIds.map((id) => `etapa_id = '${id}'`).join(' || ')
      let cards = []
      try {
        cards = $app.findRecordsByFilter('cards_execucao', filter, '', 10000, 0)
      } catch (err) {
        $app.logger().warn('Error fetching cards for progress: ' + err.message)
      }

      if (cards && cards.length > 0) {
        let cardsConcluidos = 0
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getString('quando_foi_executado')) cardsConcluidos++
        }
        progress = Math.round((cardsConcluidos / cards.length) * 100)
      } else {
        let etapasConcluidas = 0
        for (let i = 0; i < allEtapas.length; i++) {
          if (allEtapas[i].getString('status') === 'concluido') etapasConcluidas++
        }
        progress = Math.round((etapasConcluidas / allEtapas.length) * 100)
      }
    }

    if (Number.isNaN(progress)) progress = 0
    progress = Math.min(Math.max(progress, 0), 100)

    const plano = $app.findRecordById('planos', planoId)
    const clienteId = plano.getString('cliente_id')
    if (!clienteId) return e.next()

    const cliente = $app.findRecordById('clientes', clienteId)
    if (cliente.getInt('progresso') !== progress) {
      cliente.set('progresso', progress)
      $app.saveNoValidate(cliente)
    }
  } catch (err) {
    $app.logger().error('Error updating progress on card delete', 'error', err.message)
  }
  return e.next()
}, 'cards_execucao')
