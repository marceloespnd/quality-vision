import { db, hasFirebaseConfig } from '../firebase.ts'
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'

export async function createDemoProjects(owner = 'Marcelo') {
  const names = ['projects', 'flows', 'scenarios', 'impacts', 'ens']
  const previous = Object.fromEntries(names.map(name => [name, localStorage.getItem(`quality-vision-${name}`)]))
  const records = Object.fromEntries(names.map(name => {
    const parsed = hasFirebaseConfig ? [] : JSON.parse(previous[name] || '[]')
    if (!Array.isArray(parsed)) throw new Error('Unable to read local records.')
    return [name, parsed]
  }))
  const now = new Date().toISOString()
  const metadata = { createdAt: now, updatedAt: now, createdBy: owner, updatedBy: owner }
  const definitions: [string, string, string, [string, string][]][] = [
    ['nobigi', 'Novigi', 'Cadastro e acesso', [['Cadastrar cliente', 'Aprovado'], ['Validar acesso ao portal', 'Pendente']]],
    ['hp', 'HP', 'Validação de impressão', [['Enviar documento para impressão', 'Aprovado'], ['Validar impressão em rede', 'Bloqueado']]],
    ['microsoft', 'Microsoft', 'Autenticação Microsoft 365', [['Entrar com conta corporativa', 'Pendente'], ['Recuperar senha de acesso', 'Falhado']]],
    ['aws', 'AWS', 'Provisionamento de infraestrutura', [['Criar instância de teste', 'Pendente'], ['Validar acesso ao bucket S3', 'Bloqueado']]],
    ['oracle', 'Oracle', 'Integração com banco de dados', [['Executar consulta de clientes', 'Falhado'], ['Validar conexão com banco de dados', 'Bloqueado']]],
  ]
  definitions.push(['sap', 'SAP', 'Integração ERP', [['Validar acesso ao ERP', 'Aprovado'], ['Consultar pedidos de venda', 'Pendente']]])
  const additionalScenarios = {
    sap: ['Cadastrar fornecedor', 'Integrar nota fiscal', 'Consultar estoque', 'Validar fechamento financeiro'],
    nobigi: ['Validar atualização cadastral'],
    hp: ['Cancelar impressão', 'Imprimir documento em PDF', 'Verificar nível de toner'],
    microsoft: ['Validar autenticação multifator', 'Renovar sessão expirada', 'Compartilhar documento', 'Revogar acesso de usuário', 'Sincronizar arquivos', 'Validar permissões de equipe'],
    aws: ['Configurar grupo de segurança', 'Criar volume EBS', 'Restaurar snapshot', 'Configurar balanceador', 'Validar escalabilidade', 'Consultar logs CloudWatch', 'Criar usuário IAM', 'Validar política de acesso', 'Configurar alarme', 'Excluir recurso temporário'],
    oracle: ['Inserir registro de cliente', 'Atualizar dados de cliente', 'Validar chave estrangeira', 'Testar rollback de transação', 'Validar commit de transação', 'Executar procedure', 'Consultar view', 'Validar índice de consulta', 'Testar limite de conexões', 'Restaurar backup', 'Validar exportação de dados', 'Verificar timeout de consulta', 'Validar auditoria de alterações', 'Testar paginação de resultados'],
  }
  definitions.forEach(([key, , , scenarios]) => {
    additionalScenarios[key].forEach((title, index) => scenarios.push([title, ['Aprovado', 'Pendente', 'Falhado', 'Aprovado'][index % 4]]))
  })
  const append = (name, record) => { if (!records[name].some(item => item.id === record.id)) records[name].push({ ...metadata, ...record }) }
  for (const [key, name, flowName, scenarios] of definitions) {
    const projectId = `demo-carousel-${key}`, flowId = `${projectId}-flow`
    append('projects', { id: projectId, name, owner, squad: 'Core Fibra' })
    append('flows', { id: flowId, projectId, name: flowName, owner })
    scenarios.forEach(([title, status], index) => {
      const id = `${projectId}-scenario-${index + 1}`
      append('scenarios', { id, title, projectId, flowId, status: status === 'Bloqueado' ? 'Pendente' : status, description: 'Cenário de demonstração para testar o resumo dos projetos.', scriptFile: '', executedAt: ['Aprovado', 'Falhado'].includes(status) ? '2026-09-29' : '', notes: '', exclusionReason: '' })
      if (status === 'Bloqueado') append('impacts', { id: `${id}-impediment`, desc: `Ambiente de testes indisponível: ${name}`, owner, severity: 'Alta', status: 'Aberto', blocksExecution: true, projectId, flowId, scenarioIds: [id], scenarioId: '', action: 'Restabelecer o ambiente de demonstração para liberar o cenário.', startedAt: now, resolvedAt: '' })
    })
  }
  const attentionTasks = [
    { id: 'EN-DEMO-ATTENTION-AWS', projectId: 'demo-carousel-aws', desc: 'Liberar acesso ao ambiente AWS para executar os testes de infraestrutura', status: 'Bloqueado', type: 'Testes' },
    { id: 'EN-DEMO-ATTENTION-HP', projectId: 'demo-carousel-hp', desc: 'Restabelecer a impressora de rede para validar os scripts de impressão', status: 'Bloqueado', type: 'Scripts' },
    { id: 'EN-DEMO-ATTENTION-MICROSOFT', projectId: 'demo-carousel-microsoft', desc: 'Ajustar a automação de recuperação de senha após mudança no Microsoft 365', status: 'Impactado', type: 'Automação' },
  ]
  attentionTasks.forEach(task => append('ens', { ...task, squad: 'Core Fibra', owner }))
  if (hasFirebaseConfig && db) {
    for (const name of names) {
      for (const record of records[name]) {
        const { id, ...data } = record
        const reference = doc(db!, name, id)
        await runTransaction(db, async transaction => {
          const existing = await transaction.get(reference)
          if (!existing.exists()) transaction.set(reference, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        })
      }
    }
    return
  }
  try { names.forEach(name => localStorage.setItem(`quality-vision-${name}`, JSON.stringify(records[name]))) }
  catch (error) { names.forEach(name => { if (previous[name] === null) localStorage.removeItem(`quality-vision-${name}`); else localStorage.setItem(`quality-vision-${name}`, previous[name]) }); throw error }
  window.dispatchEvent(new Event('quality-vision-records'))
}

export async function createCompletedProject(owner = 'Marcelo', name = 'Projeto finalizado', projectId = 'demo-completed-project') {
  const flowId = `${projectId}-flow`
  const now = new Date().toISOString()
  const metadata = { createdAt: now, updatedAt: now, createdBy: owner, updatedBy: owner }
  const groups = {
    projects: [{ id: projectId, name, status: 'Finalizado', owner, squad: 'Core Fibra' }],
    flows: [{ id: flowId, projectId, name: 'Validação concluída', owner }],
    scenarios: Array.from({ length: 12 }, (_, index) => ({ id: `${projectId}-scenario-${index + 1}`, projectId, flowId, title: `Teste ${String(index + 1).padStart(2, '0')}`, status: 'Aprovado', executedAt: '2026-10-02', description: 'Teste concluído com sucesso.', scriptFile: '', notes: '', exclusionReason: '' })),
  }
  if (hasFirebaseConfig && db) {
    await runTransaction(db, async transaction => {
      const entries = Object.entries(groups).flatMap(([name, records]) => records.map(({ id, ...data }) => ({ reference: doc(db!, name, id), data })))
      const existing = await Promise.all(entries.map(({ reference }) => transaction.get(reference)))
      entries.forEach(({ reference, data }, index) => {
        if (!existing[index].exists()) transaction.set(reference, { ...metadata, ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })
    })
    return projectId
  }
  const previous = Object.fromEntries(Object.keys(groups).map(name => [name, localStorage.getItem(`quality-vision-${name}`)]))
  const merged = Object.fromEntries(Object.entries(groups).map(([name, additions]) => {
    const records = JSON.parse(previous[name] || '[]')
    if (!Array.isArray(records)) throw new Error('Unable to read local records.')
    return [name, [...records, ...additions.filter(record => !records.some(item => item.id === record.id)).map(record => ({ ...metadata, ...record }))]]
  }))
  try { Object.entries(merged).forEach(([name, records]) => localStorage.setItem(`quality-vision-${name}`, JSON.stringify(records))) }
  catch (error) { Object.entries(previous).forEach(([name, value]) => { if (value === null) localStorage.removeItem(`quality-vision-${name}`); else localStorage.setItem(`quality-vision-${name}`, value) }); throw error }
  window.dispatchEvent(new Event('quality-vision-records'))
  return projectId
}
