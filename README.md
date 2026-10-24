# Painel de Stacks

Painel web pessoal para acompanhar o domínio de cada stack de tecnologia: o que se sabe em teoria, o que
foi usado de verdade e o que se sabe "só por saber". A nota de cada stack é calculada (nunca digitada) a
partir das dimensões e das evidências, guarda um histórico de evolução e alimenta uma exportação para
currículo. Há dois temas: funcional e RPG, com ficha de personagem, níveis e XP.

- Especificação: [docs/SPEC.md](docs/SPEC.md)
- Progresso das etapas: [docs/PROGRESS.md](docs/PROGRESS.md)

## Funcionalidades

- **Dashboard** (`/`): totais, distribuição por nível, Top 3, stacks "esfriando" (perdendo nota por falta
  de uso), visão por categoria (radar, com toggles de categoria) e quadrante teoria × prática. Os gráficos
  têm resumo textual e "Ver dados em tabela".
- **Stacks** (`/stacks`): grade ou lista com busca (nome e tags), filtros por categoria, nível e "Só
  prática real", e ordenação por nota, nome, prática ou último uso. Os filtros ficam na URL. Adição rápida
  (nome + categoria, o resto se refina depois) e estado vazio "Adicione sua primeira stack".
- **Detalhe da stack** (`/stacks/:id`): composição da nota, dimensões editáveis por sliders,
  experiência, evidências (adicionar, editar, remover) e gráfico de evolução a partir do histórico.
  Cada alteração que muda nota ou dimensões grava um snapshot no histórico.
- **Nova / editar stack** (`/stacks/nova`, `/stacks/:id/editar`): formulário completo com validação e
  exclusão com confirmação.
- **Ficha** (`/ficha`, aparece na navegação no tema RPG): classe do personagem (pura ou multiclasse,
  pela soma das notas por categoria), nível geral com barra de XP, radar por categoria (3 a 8 categorias;
  acima disso vira barras), habilidades por categoria e colmeia de hexágonos (uma stack por hexágono).
  Ao editar uma stack que sobe de nível aparece o aviso de level-up.
- **Currículo** (`/curriculo`): filtros (categorias, nível mínimo, só o que é comprovado, incluir "sei por
  saber", mostrar nível/nota/tempo, evidências, título), pré-visualização, Markdown, copiar e imprimir
  (CSS de impressão só com o currículo). Por padrão só entra o que tem evidência ou experiência em
  projeto pessoal/produção, e a nota fica oculta.
- **Dados** (`/dados`): exportar todas as stacks em JSON e importar um JSON (arquivo ou colado) nos modos
  "Mesclar por id" (o arquivo vence) ou "Substituir tudo" (com confirmação). O arquivo é validado
  com Zod antes de qualquer gravação; JSON inválido mostra erro amigável e não altera os dados.

## Requisitos

- Node.js 20.16 ou superior (o projeto foi verificado com Node 20.16.0) e npm.
- O Vitest está na versão 3. O `npm audit` aponta um aviso em `tinypool` (dependência só de
  desenvolvimento, via Vitest 3); a correção exige Vitest 4, que pede Node 20.19 ou superior. Fica para
  quando o Node for atualizado.

## Instalação e scripts

```bash
npm install
npm run dev
```

| Script               | O que faz                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento do Vite, com a API local `/api/stacks`. |
| `npm run build`      | Checagem de tipos (`tsc -b`) e build de produção em `dist/`.        |
| `npm run preview`    | Serve o build; a API local também funciona aqui.                    |
| `npm test`           | Roda todos os testes uma vez (Vitest).                              |
| `npm run test:watch` | Testes em modo watch.                                               |
| `npm run lint`       | ESLint.                                                             |
| `npm run format`     | Formata com Prettier (`format:check` só confere).                   |

No Windows, rode os testes pelo PowerShell ou cmd (caminho `C:\...`): os testes que importam arquivos com
`?raw` falham pela Git Bash com caminho `/c/...`.

## Onde ficam os dados

O navegador não grava em disco. O plugin do Vite `server/jsonStoragePlugin.ts` expõe `GET` e `PUT`
em `/api/stacks`, que leem e gravam `data/stacks.json`.

- `data/seed.json` é versionado e contém só stacks **fictícias** de exemplo.
- `data/stacks.json` é o arquivo de trabalho com os seus dados reais. Está no `.gitignore` e é criado a
  partir do seed na primeira leitura, se não existir.
- O `PUT` valida o corpo com o schema; dados inválidos recebem 400 e o arquivo não muda. A gravação é
  atômica (arquivo temporário + rename).
- Backup: use **Dados > Exportar** para baixar um JSON e **Importar** para restaurar. Copiar
  `data/stacks.json` também serve.

## Como a nota é calculada

Detalhes e regras completas em [docs/SPEC.md](docs/SPEC.md); a implementação está em
`src/domain/scoring.ts` e `src/domain/levels.ts`.

- **Média ponderada (0 a 10):** prática 40%, profundidade 30%, teoria 20%, evidências 10%. Os pesos são
  configuráveis e normalizados se não somarem 1.
- **Evidências:** pontos por tipo, somados e limitados a 10: emprego 4, projeto 3, repositório 2,
  certificado 2.
- **Decaimento por recência** (a partir do último uso): nada até 6 meses; de 6 a 36 meses a perda cresce
  de forma linear até 20%; depois de 36 meses fica em −20%.
- A nota final é limitada a 0–10 e arredondada a uma casa decimal.
- **Níveis:** Iniciante [0, 2), Aprendiz [2, 4), Praticante [4, 6), Sênior [6, 8), Mestre [8, 10].
- **"Sei por saber":** teoria ≥ 7 e prática ≤ 3 (limites inclusivos); ganha um selo na interface.
- **Personagem (tema RPG):** XP de uma stack = nota × 100 (arredondado); XP total = soma das stacks.
  Nível = ⌊√(XP / 100)⌋, no mínimo 1 quando há stacks; o nível n começa em 100 × n² XP
  (1: 100, 2: 400, 3: 900...). As habilidades por categoria usam a mesma fórmula.

## Temas

- **Funcional** (padrão) e **RPG**. O tema é o atributo `data-theme` do `<html>`, alternado pelo botão no
  cabeçalho e salvo no `localStorage`; um script em `index.html` aplica o tema salvo antes do React montar.
- Componentes nunca usam cores literais: usam classes do Tailwind ligadas aos tokens `--theme-*`
  (`src/index.css`, `@theme inline`). Um teste barra cores fixas fora de `src/themes`.
- `src/themes/tokens.css` define o tema funcional. `src/themes/rpg.css` concentra tudo o que é do visual
  RPG; o estilo pergaminho/medieval atual é **provisório** e pode ser trocado editando só esse arquivo
  (os nomes das classes do personagem ficam em `src/features/character/classes.ts`).
- **Criar outro tema:** crie um CSS em `src/themes/` com um bloco `[data-theme='<nome>']` que defina
  exatamente os mesmos `--theme-*` de `tokens.css` (há teste para isso), importe-o em `src/index.css`,
  acrescente o nome em `TEMAS` e `ROTULOS_TEMA` (`src/themes/themes.ts`) e na lista do script de
  `index.html`. Confira o contraste (`src/themes/contraste.test.ts`).

## Arquitetura

- `src/domain/`: regras puras, sem React (tipos, schema Zod, nota, níveis, histórico).
- `src/storage/`: interface `StorageAdapter` e `JsonFileAdapter` (fala com `/api/stacks` e valida toda
  resposta). Um futuro `ApiAdapter`/Supabase implementa a mesma interface sem mexer na UI.
- `src/features/`: lógica e componentes por assunto (stacks, dashboard, personagem, currículo, dados).
- `src/components/`: componentes reutilizáveis (barras, selos, cards, gráficos, ícones, layout, movimento).
- `src/views/`: uma tela por rota, carregada sob demanda (`src/routes.tsx`).
- `server/`: plugin do Vite com a API local de arquivo.

## Estrutura de pastas

```
data/          seed.json (versionado) e stacks.json (local, ignorado)
docs/          SPEC.md e PROGRESS.md
server/        jsonStoragePlugin.ts (+ teste)
src/
  domain/      types, schema, scoring, levels, history
  storage/     StorageAdapter, JsonFileAdapter, stacksFileLoader
  themes/      tokens.css, rpg.css, ThemeProvider, toggle
  features/    stacks, dashboard, character, resume, data
  components/  base, charts, icons, layout, motion
  views/       Dashboard, Stacks, Detalhe, Formulário, Ficha, Currículo, Dados
  test/        setup, mocks do navegador, seed para testes
```

## Testes

`npm test` roda a suíte do Vitest com Testing Library e jsdom (na verificação final: 54 arquivos,
1031 testes). Cobertura por área:

- **Domínio:** schema (JSON inválido rejeitado), nota (pesos, evidências, limites, decaimento,
  "sei por saber"), níveis e histórico (não duplica snapshot idêntico).
- **Persistência:** loader do arquivo, `JsonFileAdapter` com `fetch` falso e o plugin do servidor
  (GET cria a partir do seed, PUT válido grava, PUT inválido não altera o arquivo).
- **Features:** operações do store, filtros e ordenação, modelo do formulário, dados de evolução,
  estatísticas do dashboard, quadrante, personagem/XP/level-up/colmeia, exportação para currículo e
  importação/exportação.
- **Telas:** fluxos com adapter em memória (criar, editar, excluir, adição rápida, level-up, importar),
  rotas e semântica (um h1 por página, headings, landmarks, campos rotulados).
- **Temas:** paridade de tokens entre temas, contraste WCAG, ausência de cores fixas e movimento no CSS
  só com `prefers-reduced-motion: no-preference`.

## Roteiro de verificação manual ponta a ponta

Antes de começar, faça uma cópia de `data/stacks.json` se quiser preservar os dados.

1. `npm run dev` e abra o endereço mostrado no terminal.
2. **Criar stack:** em Stacks, use a adição rápida (nome + categoria). Abra `data/stacks.json` e confira a
   nova stack com um registro no `historico`.
3. **Editar stack:** no detalhe, mude um slider de dimensão e salve. Confira em `data/stacks.json` as
   dimensões novas e um snapshot novo no fim do `historico` (data, dimensões e nota). Salvar sem mudar nada
   não deve criar snapshot.
4. **Temas:** alterne para RPG no cabeçalho, recarregue a página (o tema persiste), abra a Ficha e volte
   para o funcional.
5. **Currículo:** mude filtros (categoria, nível mínimo, "só comprovado", nota visível) e confira a
   pré-visualização e o Markdown; teste Copiar e Imprimir.
6. **Importar JSON inválido:** em Dados, cole `{"versao": 1, "stacks": [{"id": 1}]}` e importe. Deve
   aparecer erro amigável, e `data/stacks.json` não pode mudar.
7. Exporte em Dados e, se quiser, restaure a cópia feita no início.

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

## Limitações conhecidas

- `npm audit`: aviso em `tinypool` via Vitest 3 (só desenvolvimento). A correção exige Vitest 4 e
  Node ≥ 20.19.
- O estilo visual do RPG é provisório (pergaminho); tudo está isolado em `src/themes/rpg.css` para troca.
- Mobile: a ordem de Tab percorre a navegação antes de Dados/Tema, diferente da ordem visual.
- Gráfico de evolução em 320 px: o rótulo da última nota encosta no rótulo da faixa de nível.
- Testes com `?raw` falham se rodados pela Git Bash com caminho `/c/...`; use `C:\` (PowerShell/cmd).
- Persistência só local: a API existe apenas no servidor do Vite (`dev` e `preview`); o build estático
  sozinho não grava dados.

## Próximos passos sugeridos

- Backend real: implementar um `ApiAdapter` (por exemplo, Supabase) sobre a interface `StorageAdapter`,
  sem mudar a UI.
- Novo estilo visual para o tema RPG, editando só `src/themes/rpg.css` (e os textos de
  `src/features/character/classes.ts`).
- Atualizar para Vitest 4 quando o Node for atualizado para 20.19 ou superior, resolvendo o aviso do
  `npm audit`.
