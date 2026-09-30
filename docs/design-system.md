# Quality Vision — padrões de interface

## Tokens e componentes

A fonte de cores e medidas é `src/styles/design-system.css`. O HTML não define tokens. Cores antigas (`green`, `red`, `orange`, `gray`) são aliases dos tokens semânticos de status.

- Espaçamentos: 4, 8, 12, 16, 24 e 32 px; 24 px entre seções, 8 px entre rótulo e controle.
- Tipografia: título de página 24–28 px, seção 20 px, conteúdo 14–16 px, metadados 12 px.
- Raios: controle 8 px, card 12 px, painel 16 px.
- `Button`: primary, secondary, quiet e danger; mínimo de 44 px de altura. Reservar danger para ações destrutivas, reveladas no contexto apropriado.
- `Field` / `SelectField`: rótulo associado, obrigatório explícito, ajuda e erro ligados por `aria-describedby`; campos dependentes devem explicar a seleção necessária.
- `StatusBadge`: texto e ícone além da cor.
- `StatCard`: só cards com ação recebem hover e “Ver detalhes”.
- `SummaryStrip`: contagens compactas para listas e projetos.
- `EmptyState`: orientação e ação adequada ao estado inicial ou aos filtros.
- `ConfirmDialog`: diálogo nativo modal, foco inicial em Cancelar, Escape, retorno do foco, bloqueio de envio duplicado e erro anunciado.

## Layout e navegação

- Uma página tem um `h1`; seções usam `h2`.
- Links de navegação têm URL real e `aria-current=page`.
- Abaixo de 1280 px, menu recolhível no cabeçalho; sidebar em telas maiores.
- Abaixo de 768 px, cenários e fluxos aparecem em cards. Filtros de cenários são recolhíveis; no desktop ficam expostos.
- A lista de cenários prioriza script/cenário, fluxo, status e ações. Data, observações e vínculos ficam nos detalhes. Ordenação por data continua disponível no seletor.
- Ações em lote aparecem apenas com seleção; indicadores respeitam os filtros.
- Sucessos usam `role=status`; falhas usam `role=alert`. Movimento respeita a preferência do sistema.

## Validação

Validar desktop e celular, ambos os temas, textos longos, estados vazios, carregamento, erro e edição. Verificar teclado e foco de diálogos. A inspeção do DOM e testes manuais não substituem avaliação completa com leitores de tela.

### Verificações realizadas nesta revisão

- Build de produção concluída; 26 testes de domínio e tradução passaram.
- Cadastro de projeto, fluxo e cenário testado via interface em `localhost`, separado da origem `127.0.0.1`. Os registros “Validação UX local” são dados de teste locais.
- Cenários: layout preenchido em 1280 px e cards em 390 px; largura de conteúdo igual à viewport em 320 e 390 px.
- Confirmação de exclusão: foco em Cancelar, fechamento por Escape e retorno ao botão de origem. Nenhum registro foi excluído durante a verificação.
- Contraste calculado dos tokens (claro / escuro): texto 14,57 / 11,66; texto secundário 5,49 / 6,19; botão primário 4,63 / 9,35; borda de campo 3,37 / 3,47. Status de sucesso, falha e pendência acima de 4,5 em ambos os temas.
- Capturas em `artifacts/ux-review/`. A verificação não cobre todos os pares de cores nem substitui testes com leitor de tela.
