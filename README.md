# api-quality-vision v1.43.1

Aplicação React + Vite para acompanhamento de indicadores de qualidade, evolução de ENs, histórico de bugs e configurações operacionais.

## Melhorias recentes

- Reintrodução de componentes reutilizáveis para UI e ações comuns.
- Redução de dependências frágeis na camada visual.
- Ajuste para estabilizar a build em ambientes sem ativos estáticos externos.
- Documentação alinhada com a versão publicada.

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
