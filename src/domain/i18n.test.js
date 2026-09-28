import test from 'node:test'
import assert from 'node:assert/strict'
import { messages, translate, normalizeLocale } from '../i18n/messages.js'
import { scenarioStatuses, summarize } from './testing.js'
test('rótulos em inglês são traduzidos para português e vice-versa', () => {
  for (const [english, portuguese] of Object.entries(messages)) {
    assert.equal(translate(english, 'pt-BR'), portuguese)
    assert.equal(translate(translate(english, 'pt-BR'), 'pt-BR'), portuguese)
    assert.equal(typeof translate(portuguese, 'en-US'), 'string')
  }
  assert.equal(translate('Flow', 'pt-BR'), 'Fluxo')
  assert.equal(translate('Pendente', 'en-US'), 'Pending')
  assert.equal(translate('Pending', 'pt-BR'), 'Pendente')
})
test('locale inválido e variações de caixa possuem fallback seguro', () => {
  assert.equal(normalizeLocale('en-us'), 'en-US')
  assert.equal(normalizeLocale('pt-br'), 'pt-BR')
  assert.equal(normalizeLocale('xx'), 'pt-BR')
})
test('tradução preserva dados e valores internos usados em cálculos', () => {
  assert.equal(translate('Posnet', 'en-US'), 'Posnet')
  assert.equal(translate('01-logon_estab.xml', 'pt-BR'), '01-logon_estab.xml')
  const snapshot = [...scenarioStatuses]
  scenarioStatuses.forEach((s) => translate(s, 'en-US'))
  assert.deepEqual(scenarioStatuses, snapshot)
  assert.equal(summarize([{ status: 'Aprovado' }]).progress, 100)
})
test('mensagens parametrizadas preservam valores e traduzem confirmação', () => {
  assert.equal(translate('Delete 6 selected scenario(s)? This action cannot be undone.', 'pt-BR'), 'Excluir 6 cenário(s) selecionado(s)? Esta ação não pode ser desfeita.')
  assert.equal(translate('Associar impacto a Posnet', 'en-US'), 'Link impact to Posnet')
})
