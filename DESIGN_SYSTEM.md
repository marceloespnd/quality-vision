# Quality Vision — Design System

O visual Liquid Glass está em `src/styles/liquid-glass.css`, aplicado sobre os tokens base e as utilidades Tailwind. Todas as telas compartilham superfícies translúcidas, desfoque, bordas luminosas e gradientes ambientais, com temas claro e escuro. Evite desfoques adicionais em superfícies aninhadas. Há fallback opaco para navegadores sem backdrop-filter e preferência por transparência reduzida.

A base está em `src/styles/design-system.css`; os componentes reutilizáveis estão em `src/components/ui.jsx` e `Icon.jsx`.

- Espaçamento: 4, 8, 12, 16, 24 e 32 px. Use os tokens `--space-*` ou classes equivalentes.
- Tipografia: títulos principais 24–28 px; seções 20 px; conteúdo 14–16 px; metadados 12 px.
- Controles: altura mínima 44 px e raio 12 px. Superfícies internas: 16 px; cartões e diálogos: 24 px; navegação: 28 px.
- Botões: `Button` primário para a ação principal; `secondary` para alternativas; `danger` para exclusão. Evite múltiplas ações primárias na mesma seção.
- Campos: use `Field` ou `SelectField`, sempre com rótulo visível. `help` e `error` são vinculados via aria-describedby; erros usam aria-invalid e role=alert. IDs são gerados automaticamente.
- Tabelas: classe `ds-table`, cabeçalhos semânticos, células numéricas com `ds-number`, seleção com aria-selected. Em telas pequenas, mantenha rolagem horizontal no contêiner.
- Status: use `StatusBadge` com o valor interno. Cor, texto traduzido e ícone vêm do mesmo componente em todas as telas.
- Cores: use tokens semânticos de superfície, texto, borda, ação, sucesso, falha, pendência e exclusão. Variantes escuras dependem de data-theme no elemento raiz.
- Ícones: `Icon`, traço uniforme, 20 px em navegação e 16 px em status. Ações sem texto precisam de aria-label no botão. Ícones decorativos ficam ocultos dos leitores de tela.
- Acessibilidade: preserve foco visível, rótulos e navegação por teclado. Não comunique estado apenas com cor. Respeite redução de movimento.
- Idioma: centralize textos fixos em `src/i18n`; traduza com `t`. Não traduza nomes de projetos, arquivos, responsáveis ou conteúdo cadastrado. Testes de tradução ficam em `src/domain/i18n.test.js`.

Validação: `npm test` e `npm run build`. Confira visualmente os temas claro/escuro e os idiomas pt-BR/en-US ao alterar componentes compartilhados.
