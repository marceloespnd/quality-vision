# api-quality-vision v1.43.1

Aplicação React + Vite para acompanhamento de indicadores de qualidade, evolução de ENs, histórico de bugs e configurações operacionais.

## Melhorias recentes

- Reintrodução de componentes reutilizáveis para UI e ações comuns.
- Redução de dependências frágeis na camada visual.
- Ajuste para estabilizar a build em ambientes sem ativos estáticos externos.
- Documentação alinhada com a versão publicada.

## Impactos

Acesse **Impactos** no menu para cadastrar, editar e excluir impactos, definir gravidade,
responsável e plano de ação, e acompanhar os estados Aberto, Em tratamento e Resolvido.
A busca considera descrição, responsável, plano de ação e tarefa/projeto vinculado.
O vínculo opcional com tarefas não altera seus status; tarefas excluídas aparecem como indisponíveis.

Sem Firebase, os impactos persistem no navegador em `quality-vision-impacts`.
Com Firebase, usam a coleção `impacts` e sincronização em tempo real. Publique as regras
de `firestore.rules` no ambiente: leitores autenticados podem consultar, editores podem
criar/editar e administradores podem excluir, seguindo os papéis já usados no projeto.
O aplicativo atual não implementa login; ambientes com essas regras exigem a integração
de autenticação existente antes de permitir acesso remoto.

## Cenários e vínculos

Na aba **Cenários**, cadastre um nome e uma descrição opcional. Cada cenário mostra
seus impactos associados e permite associar impactos sem cenário ou desvinculá-los.
Na aba **Impactos**, o campo **Cenário vinculado** permite escolher, trocar ou remover
o cenário de um impacto. Um cenário pode conter vários impactos; cada impacto possui
no máximo um cenário. Desvincular preserva ambos os registros e seus status.

Os cenários usam `quality-vision-scenarios` no navegador ou a coleção `scenarios`
no Firebase. O vínculo é salvo em `impacts.scenarioId`; impactos antigos sem esse
campo continuam válidos. As regras atualizadas devem ser publicadas para uso remoto.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Estrutura principal

```text
src/
  App.jsx
  constants.js
  utils.js
  firebase.js
  mockData.js
  components/
    ui.jsx
  assets/
```

## Configuração Firebase

Copie `.env.example` para `.env` e preencha as variáveis `VITE_FIREBASE_*`.

Sem Firebase configurado, a aplicação usa dados mockados locais.

## Deploy na Vercel

O projeto já inclui `vercel.json` com configuração para Vite SPA:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Rewrites: todas as rotas apontam para `index.html`

No painel da Vercel, cadastre as variáveis de ambiente abaixo em Project Settings → Environment Variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Para publicar via CLI:

```bash
npm install
npm run build
npx vercel
```

## Code review

Consulte `CODE_REVIEW.md` para ver os pontos analisados, melhorias aplicadas e próximos passos recomendados.

## Visão consolidada por projeto

Acesse **Visão do Projeto** para criar/editar projetos e seus fluxos, com IDs estáveis
 e responsáveis obrigatórios. Os nomes do cadastro antigo são sugeridos ao criar
projetos; não há atribuição automática de responsáveis. Fluxos não podem mudar de
projeto depois de criados, preservando a integridade dos cenários associados.

Em **Cenários**, informe projeto, fluxo e status de execução. Aprovados e falhados
exigem data de execução; excluídos exigem justificativa e permanecem no histórico.
Para os registros anteriores, use **Sem associação**, selecione os cenários, escolha
**Fluxo de destino** e clique em **Associar selecionados**. A operação preserva IDs,
conteúdo e vínculos com impactos. Registros sem status são tratados como pendentes.
Os vínculos não são inferidos por nome: cenários sem associação válida ficam fora
 dos indicadores e são sinalizados na visão do projeto. Em caso de erro em uma
associação em lote, os itens já salvos permanecem associados e os restantes continuam
selecionados para nova tentativa.

As coleções são `projects`, `flows`, `scenarios` e `impacts`; no modo local, usam as
chaves `quality-vision-*`. Publicar `firestore.rules` é necessário para uso remoto.
Leitores podem consultar e editores podem criar/editar. Não se permite excluir
projetos, fluxos ou cenários fisicamente. Cenários antigos podem ser lidos e passam
 a exigir a estrutura completa quando editados/associados. A autenticação continua
sendo uma dependência do ambiente Firebase; nenhuma regra pública foi adicionada.

A execução é `(aprovados + falhados) / (total - excluídos)`; aprovação é
`aprovados / (total - excluídos)`. Sem escopo válido, o percentual é indefinido,
exibido como travessão. O total do projeto é calculado pelas somas dos cenários,
nunca pela média simples dos percentuais dos fluxos. Filtros da tabela não alteram
os indicadores gerais. Mudanças são refletidas pelos listeners de dados.

URLs: `/projetos?projectId=ID` e `/cenarios?projectId=ID&flowId=ID&status=Falhado`.
Os filtros persistem após recarga e funcionam com voltar/avançar do navegador.
O parâmetro `unassigned=1` mostra cenários sem associação válida.

Validação: `npm test` cobre cálculos, escopo vazio, exclusões, normalização de
legados e vínculos incompatíveis. `npm run build` valida a compilação da interface.
As regras devem ser verificadas no emulador/ambiente Firebase antes da publicação.

## Idiomas da interface

O seletor em Configuração → Geral controla pt-BR/en-US por contexto React. O
catálogo está em `src/i18n/messages.js`; use `useTranslation()` para textos da
interface. Traduza os rótulos na renderização, mantendo IDs, valores dos filtros,
status persistidos e textos cadastrados pelo usuário intactos. A preferência fica
em `quality-vision-language`; valores inválidos usam pt-BR. Os testes de tradução
estão incluídos em `npm test`.
