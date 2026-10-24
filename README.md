# Painel de Stacks

Painel local para registrar e avaliar o domínio de cada stack/tecnologia, com nota calculada a partir de dimensões
(teoria, prática, profundidade, evidências), histórico de evolução e exportação para currículo.

- Especificação: [docs/SPEC.md](docs/SPEC.md)
- Progresso: [docs/PROGRESS.md](docs/PROGRESS.md)

## Checklist manual de acessibilidade e responsividade

Os testes automatizados cobrem contraste dos tokens (`src/themes/contraste.test.ts`), movimento no CSS,
um h1 por página, headings sem saltos, landmarks e campos rotulados (`src/views/semantica.test.tsx`).
O resto precisa de olho e mão. Rode `npm run dev` e confira antes de cada entrega.

### Teclado (sem mouse, nos dois temas)

- [ ] Em qualquer página, o primeiro Tab mostra "Pular para o conteúdo"; Enter leva o foco ao conteúdo principal.
- [ ] Todo elemento interativo mostra contorno de foco visível (no RPG, também o brilho dourado).
- [ ] A ordem do Tab segue a leitura: cabeçalho (marca, navegação, Dados, tema), conteúdo, rodapé.
- [ ] Ao trocar de página por um link, o foco vai para o título (h1) da nova página.
- [ ] Dashboard: tiles, distribuição por nível, rankings, toggles de categoria e "Ver dados em tabela" abrem com Enter.
- [ ] Stacks: quick add, filtros, "Só prática real", Grade/Lista e os links dos cards funcionam pelo teclado.
- [ ] Detalhe: sliders de dimensões mudam com as setas; Salvar/Desfazer; evidências (adicionar, editar, remover);
      Esc fecha o formulário e a confirmação de remoção, e o foco volta ao botão que abriu.
- [ ] Detalhe: no gráfico de evolução, os toggles de séries alternam com Enter/Espaço; os valores do tooltip
      estão em "Ver dados em tabela" (a tabela rola com as setas quando focada).
- [ ] Nova/Editar stack: erro de validação leva o foco ao primeiro campo inválido; "Excluir stack" abre a
      confirmação com foco em "Cancelar exclusão", e Esc devolve o foco ao botão.
- [ ] Currículo: abas Visualizar/Markdown trocam com as setas, Home e End; filtros e botões alcançáveis.
- [ ] Ficha (tema RPG): um Tab entra na colmeia, as setas movem entre hexágonos (anel de foco visível),
      Enter abre a stack, Esc fecha o cartão de detalhes.
- [ ] Dados: escolher arquivo, colar JSON, modos de importação; em "Substituir tudo", Esc ou "Voltar" fecham a
      confirmação e o foco volta para "Importar".

### Leitor de tela (NVDA ou Narrador)

- [ ] O título de cada página é anunciado ao navegar; a aba do navegador mostra "<página> · Painel de Stacks".
- [ ] Landmarks: banner, navegação "Principal", main e contentinfo.
- [ ] Gráficos são lidos pelo resumo (role="img") e há tabela equivalente; ícones decorativos ficam em silêncio.
- [ ] Barras de nota/XP leem o valor ("7,5 de 10"); sliders leem "x de 10".
- [ ] Erros de formulário são lidos como descrição do campo; avisos de sucesso e level-up são anunciados.

### Contraste (nos dois temas)

- [ ] Bordas de campos, selects, checkboxes, sliders e botões secundários visíveis (≥ 3:1).
- [ ] Texto normal, desabilitado legível, erro (vermelho) e sucesso (verde) legíveis sobre os fundos.
- [ ] Foco visível sobre botões primários e sobre os painéis claros.

### Larguras e zoom

- [ ] 320 px: sem rolagem horizontal da página; a navegação rola sozinha; tabelas rolam dentro do próprio contêiner.
- [ ] 768 px e 1280 px: layout em colunas sem sobreposição; colmeia e cartão de detalhes dentro da tela.
- [ ] Formulários em uma coluna no celular; alvos de toque com pelo menos 24 px.
- [ ] Zoom de 200% no navegador (1280 px): todo conteúdo e função continuam acessíveis, sem cortar texto.

### Movimento e impressão

- [ ] Com "reduzir movimento" ligado no sistema: sem animação na barra de XP, no level-up e nas transições do RPG.
- [ ] Currículo > Imprimir: só o currículo vai para o papel (sem cabeçalho, navegação, filtros e rodapé),
      em preto no branco e legível nos dois temas.
