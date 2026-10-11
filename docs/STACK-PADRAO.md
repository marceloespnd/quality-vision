# Padronização técnica — 1.49.0

Versão anterior: 1.48.0. Versão nova: 1.49.0. Alterações anteriores no checkout foram preservadas.

A base `platform/` v1.0.0 é idêntica nos três repositórios e contém primitivas headless, formatação, configurações, referências de ambiente, workflow e sincronizador. Não há dependência de outro checkout. O manifesto `platform/stack.json` e `env:check` detectam divergência nas versões comuns.

Node 24.21.0, npm 11.19.0, React 19.3.0, Firebase 12.19.0, TypeScript 5.9.3 e Tailwind 4.3.3 foram instalados e validados. O compilador 5.9.3 foi escolhido como linha comum dos perfis; Quality Vision anteriormente declarava 7.0.2. Vite 8.3.3 nas SPAs; Next 16.3.0 no Veltrix. A adoção de versões novas exige validação dos dois perfis.

Adaptadores reais consomem botões, campos, tabelas, carregamento, ciclo de modal e/ou utilitários de formatação. Regras de negócio, tradução, estilos e persistência continuam por aplicativo. O modal do Oikonomia preserva a proteção de rascunhos.

## Validação local

- Instalação limpa com `npm ci`.
- `npm run check`: ambiente, ESLint, tipos, 28 testes de domínio/compartilhados e build.
- `npm run test:e2e`: 2 testes de navegador/API anônima.
- `npm run test:auth`: 3 testes no emulador; no Veltrix, inclui duas verificações das APIs com sessões e origem.
- Cópias do template conferidas por `platform/sync.mjs --check`.

Os emuladores usam `demo-platform`, sem dados de produção. Java 21 foi baixado temporariamente em `/tmp` para os testes locais; CI instala Java automaticamente. Docker não foi executado porque o daemon estava desligado. Os builds das SPAs ainda emitem avisos de tamanho de bundle. O workflow foi criado; sua execução hospedada depende do push.

## Legados

Ferramentas de migração de dados permanecem quando ainda têm comandos ativos. No Veltrix, dependências sem importação ativa (cliente/adaptador Prisma, bcryptjs e jose) foram removidas; CLI Prisma e pg permanecem para migração. No Oikonomia, instruções geradas de Next foram substituídas pela arquitetura Vite. No Quality Vision, funções/importações sem uso foram removidas ou bindings descartados explicitamente. Arquivos gerados de dependências/cache deixam de ser versionados quando encontrados.

Nenhuma migração de dados, publicação de frontend ou alteração de regras remotas foi realizada.

## Validação Docker posterior — 1.49.1

Em 11/10/2026, build, healthcheck, rotas, assets/cache e renderização/login em Chromium passaram em contêineres isolados. O Dockerfile passou a copiar `.nvmrc` e `.node-version` antes do preinstall. Versão 1.49.0 → 1.49.1. Os contêineres de teste foram encerrados após a validação.

## Revisão e release — 1.50.0

Em 11/10/2026, revisão das alterações pendentes de interface, gráficos, migração TypeScript e base compartilhada. Versão sincronizada em package.json, package-lock.json, src/constants.ts e README.md.

Validação: ambiente, lint, tipos, 28 testes de domínio/compartilhados, build e 2 testes Chromium passaram pelo `npm run check:all`. A etapa de autorização foi repetida com Java 21 temporário no PATH e os 3 testes Firestore passaram. O ambiente padrão não tem Java configurado. Permanece o aviso de bundle Firebase acima de 500 kB.
