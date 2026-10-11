# Stack e padrões técnicos do Quality Vision

Este documento define a stack de referência para manutenção e novas funcionalidades.
As versões abaixo são as linhas declaradas em `package.json`; as versões exatas
instaladas estão em `package-lock.json`. Alterações de versão ou substituições de
tecnologia devem atualizar este documento e validar os fluxos afetados.

## Tecnologias utilizadas

| Camada | Tecnologia | Uso e referência |
| --- | --- | --- |
| Linguagem | TypeScript 5.9.3, ES Modules e TSX | Lógica e componentes em `src/`; script de importação em `firebase/importSeed.ts`. |
| Interface | React 19 e React DOM 19 | Componentes, hooks, contexto e renderização em `src/main.tsx`. |
| Estrutura | HTML5 | Entrada em `index.html` e elementos semânticos nos componentes. |
| Estilos | CSS3 e Tailwind CSS 4 | Tokens, responsividade e temas em `src/styles/`; utilitários em `src/styles/tailwind.css`, compilados com `@tailwindcss/vite`. |
| Build | Vite 8 e plugin React 6 | Desenvolvimento e compilação em `vite.config.ts`. |
| Gráficos | Chart.js 4 e react-chartjs-2 5 | Gráficos integrados aos componentes React. |
| Serviços remotos | Firebase SDK 12 | Inicialização centralizada em `src/firebase.ts`. |
| Banco | Cloud Firestore | Persistência e listeners em tempo real; acesso por `src/hooks/useRecords.ts`. |
| Autenticação | Firebase Authentication | E-mail/senha e Google em `src/components/FirebaseAccess.tsx`. |
| Autorização | Firestore Security Rules e índices | `firestore.rules` e `firestore.indexes.json`; publicação separada do build do frontend. |
| Persistência local | localStorage | Dados no modo sem Firebase, preferências e recuperação; chaves `quality-vision-*`. |
| Navegação | History API e URLSearchParams | Rotas e filtros em `src/hooks/useNavigation.ts`. |
| Internacionalização | React Context e Intl | pt-BR/en-US em `src/i18n/` e formatação conforme o idioma. |
| Ícones | SVG | Componentes de ícones em `src/components/Icon.tsx`. |
| Runtime de ferramentas | Node.js 24.21.0 | Linha usada pelo `Dockerfile`; adotar também no desenvolvimento local. |
| Dependências | npm | Scripts em `package.json` e instalação reproduzível com `npm ci`. |
| Testes | Runner nativo do Node | `node --test` executado por `npm test`, com testes em `src/domain/`. |
| Importação | dotenv 17 e JSON | Variáveis de ambiente em `firebase/importSeed.ts`; arquivos em `firebase/seed/`. |
| Contêineres | Docker e Docker Compose | Desenvolvimento e produção em `Dockerfile` e `compose.yaml`. |
| Servidor de produção | Nginx | Arquivos compilados, cache, fallback de SPA e `/health` em `docker/nginx.conf`. |
| Configuração de hospedagem | Vercel | `vercel.json` define build Vite e redirecionamento de rotas; não comprova implantação ativa. |

## Padrões para novas alterações

- Usar TypeScript/TSX, ES Modules, componentes funcionais e hooks. Centralizar regras
  de negócio puras em `src/domain/` e cobrir regras relevantes com o runner existente.
- Reutilizar os componentes de UI e os tokens de `src/styles/design-system.css`.
  Seguir [os padrões de interface](design-system.md) para temas, acessibilidade e layout.
  Compilar os utilitários Tailwind pelo Vite; não adicionar CDN de estilos.
- Usar Chart.js com react-chartjs-2 para gráficos; evitar adicionar outra biblioteca
  para uma necessidade já atendida pela integração existente.
- Reutilizar a inicialização Firebase e os hooks de dados. Manter os modos local e
  remoto funcionando. Alterações no modelo remoto devem revisar regras e índices.
- Aplicar permissões no Firestore. A interface não atribui papéis ao usuário.
  As variáveis `VITE_*` são públicas; credenciais administrativas pertencem a um
  ambiente confiável fora do frontend.
- Usar o hook de navegação existente para rotas e filtros. Validar recarga direta
  e voltar/avançar quando alterar navegação.
- Colocar textos da interface no catálogo de tradução e usar `Intl` com o locale
  selecionado. Preservar IDs, status persistidos e conteúdo cadastrado pelo usuário.
- Usar Node 24.21.0 e npm; versionar `package-lock.json` junto às alterações de dependências.
  Avaliar novas dependências pelo problema concreto que resolvem e evitar duplicações.

## Validação e reprodução

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Para mudanças visuais, verificar os temas claro/escuro, desktop/celular e os estados
afetados. Para mudanças de dados, verificar os modos local/remoto. Testes Node e build
não validam as regras do Firestore: elas exigem verificação no emulador ou ambiente
Firebase antes da publicação.

## Migração e compatibilidade

Os arquivos da aplicação, testes, configuração Vite e importação foram migrados
para `.ts`/`.tsx`. `src/types.ts` centraliza modelos de registros e navegação;
`useRecords` infere o tipo pela coleção. Vite transpila e `tsc --noEmit` verifica
os tipos antes de cada build. Os testes e o seed usam o suporte nativo do Node
para remover tipos; usam o ambiente fixado em Node 24.21.0 e npm 11.19.0.

O `tsconfig.json` ativa `strict`, com duas exceções de transição: `noImplicitAny`
e `useUnknownInCatchVariables` permanecem desativados para os parâmetros e erros
legados. Portanto, a migração ainda não garante tipagem estrita completa de todos
os caminhos. Novos contratos devem ter tipos explícitos e evitar `any`.

Tailwind 4 substitui o CDN e a configuração inline. Classes renomeadas e estilos
base de compatibilidade preservam sombras, contornos, bordas e centralização de
diálogos. O CSS próprio permanece após o Tailwind. A versão 4 requer Safari 16.4+,
Chrome 111+ ou Firefox 128+, conforme o [guia oficial](https://tailwindcss.com/docs/upgrade-guide).

Vite 8 usa Rolldown; a divisão de bundles está em `build.rolldownOptions`.
A migração segue os guias de [Vite](https://vite.dev/guide/migration.html) e
[React](https://react.dev/blog/2024/04/25/react-19-upgrade-guide).

A dependência sem uso `update` foi removida. O override de `@grpc/grpc-js` em
`@firebase/firestore` fixa 1.14.5, que corrige o
[alerta de certificados](https://github.com/advisories/GHSA-m9gg-hp2v-232j).
Reavaliar esse override quando o Firebase atualizar sua dependência transitiva.

A imagem de build fixa `node:24.21.0-alpine`; Nginx permanece em
`nginx:stable-alpine`, sem digest fixado. Vercel permanece como configuração
alternativa de hospedagem. A migração não publica o frontend nem regras Firebase.

## Verificação desta migração

- 26 testes de domínio e tradução, checagem de tipos e build de produção em Node 24.21.
  O build mantém um aviso de bundle Firebase acima de 500 kB.
- A afirmação de audit da migração anterior não se aplica automaticamente às novas ferramentas de desenvolvimento; nenhuma auditoria de dependências foi realizada nesta padronização.
- Interface local: carregamento de demonstração, gráficos, filtro de projeto e
  cadastro de cenário persistido após recarga; layout móvel de 390 px sem overflow
  horizontal. Nenhum erro ou warning de console observado nesses fluxos.
- Tela de login renderizada com Firebase configurado. Login real, gravação remota,
  regras Firestore e imagem Docker precisam ser validados no ambiente correspondente.
  A tentativa de `docker compose build app` não pôde conectar ao daemon Docker desligado.
