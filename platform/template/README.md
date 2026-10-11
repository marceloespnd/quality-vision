# Arquivos do template

Arquivos ocultos e workflow são gerenciados por `platform/sync.mjs`. Os exemplos de ambiente são referências por perfil; cada aplicativo mantém seu próprio `.env.example`. Nunca substituir `.env` existente nem copiar credenciais. Os scripts de validação e dependências devem seguir `platform/stack.json` e o contrato em `platform/README.md`.

Os adaptadores ESLint e TypeScript ficam na raiz de cada app e importam/estendem `platform/eslint.mjs` e `platform/tsconfig.base.json`. O perfil Next acrescenta eslint-config-next, plugins e tipos de rotas; o perfil Vite acrescenta vite/client. Essa separação permite atualizar a base sem sobrescrever a configuração de framework.
