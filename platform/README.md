# Base técnica compartilhada — v1.0.0

Esta pasta é o template comum (`template/` contém workflow, ambiente e configurações de referência), versionado em cada repositório. Não depende de pastas irmãs, links simbólicos ou registro privado. Os arquivos devem ser idênticos nos três projetos. O aplicativo adapta os primitivos sem estilos, mantendo seus tokens, traduções e regras de domínio.

## Ambiente e comandos

Node 24.21.0 e npm 11.19.0, fixados em `.nvmrc`, `.node-version`, `engines` e `packageManager`. Execute `nvm use`, `npm ci`, copie `.env.example` para `.env` e execute `npm run dev`. `npm run env:check` verifica o ambiente.

Contrato: `dev`, `start`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `test:auth`, `check` e `check:all`. `check` executa ambiente, lint, tipos, testes e build; `check:all` acrescenta navegador e autorização. Nas SPAs, `start` é uma prévia local; produção usa hospedagem estática/Nginx. No Next, é o servidor de produção.

## Convenções

- `platform/shared`: primitivas reutilizáveis e formatação; sem Firebase, domínio, estilos ou credenciais.
- `src/components` (ou `app/components` no Oikonomia): adaptadores visuais e composição.
- `src/domain` / `app/lib` / `src/lib`: regras específicas; manter funções puras testáveis.
- Acesso a dados fica nos hooks/repositórios existentes; componentes novos não inicializam Firebase.
- `tests/e2e`: fluxos de navegador. `tests/auth`: autorização no emulador.
- Novos módulos têm tipos explícitos. Exceções de tipagem legadas não são justificativa para novos `any`.

## Compartilhar e atualizar

Após alterar a base, execute `node platform/sync.mjs --to ../outro-projeto`, revise o diff e valide o projeto destino. Para detectar divergência use `node platform/sync.mjs --check ../outro-projeto`. A ferramenta também sincroniza `.nvmrc`, `.node-version`, `.npmrc`, `.editorconfig` e o workflow. A cópia preserva independência de clone/build; atualizações são explícitas. Ao mudar a API comum, incremente a versão deste template e atualize os adaptadores dos três projetos.

## Template para próximos projetos

Use um dos repositórios como referência do perfil desejado (Vite ou Next); copie `platform/`, `.nvmrc`, `.node-version`, `.npmrc`, a configuração ESLint, o `extends` de TypeScript e `.github/workflows/validate.yml`. Adote o contrato de scripts do `package.json`, configure `.env.example` sem credenciais administrativas, acrescente regras e testes de autorização específicos. Não copie dados, `.env`, identificadores de produção ou regras de negócio. O pipeline é comum; o framework e o deploy permanecem por perfil.

## Validação e segurança

CI instala Chromium e Java 21 e usa um projeto `demo-*` para o emulador Firestore, sem credenciais de produção. `test:auth` exige Java 21 local e baixa o emulador na primeira execução. Os testes de Rules usam SDK web; não comprovam autorização de APIs que usam Admin SDK. No Veltrix, testes de navegador verificam também rejeição anônima nas APIs; `test:auth` testa duas sessões autenticadas e isolamento entre proprietários com Auth + Firestore Emulator. Smoke remoto completo continua separado e exige ambiente dedicado.

Variáveis `VITE_*` e `NEXT_PUBLIC_*` são públicas. Credenciais administrativas ficam somente no servidor. Não publicar regras, migrar dados nem executar smoke remoto automaticamente nesta base.
