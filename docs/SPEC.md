# Painel de Stacks — Especificação

## Objetivo
Painel web pessoal para acompanhar o domínio de stacks de tecnologia: o que sei em teoria, o que
usei de verdade, o que sei "só por saber", com nota calculada, histórico de evolução, exportação
para currículo e temas trocáveis (funcional / RPG com ficha de personagem, níveis e XP).
As stacks são cadastradas pela própria aplicação; nenhum dado real é pré-requisito.

## Especificação técnica
- Vite + React + TypeScript; Tailwind + CSS variables (temas = tokens + uma view extra); Zod;
  Recharts (siga o skill "dataviz" nos gráficos); Framer Motion; Vitest + Testing Library;
  ESLint + Prettier.
- Persistência: o navegador não grava em disco. Plugin do Vite (server/jsonStoragePlugin.ts)
  expõe GET/PUT /api/stacks que lê/grava data/stacks.json. O front usa a interface StorageAdapter
  (JsonFileAdapter agora; ApiAdapter/Supabase no futuro sem mexer na UI), pois o app poderá virar produto.
  Dados reais não vão para o git: o seed fictício fica em data/seed.json (versionado);
  data/stacks.json é o arquivo de trabalho, ignorado pelo git, criado a partir do seed se não existir.
- Modelo (src/domain/types.ts): Stack { id, nome, categoria, tags[],
  dimensoes{teoria 0-10, pratica 0-10, profundidade 0-10, ultimoUso: data},
  experiencia{tipo: so_teoria|estudo|projeto_pessoal|producao, meses},
  evidencias[{titulo, url?, descricao, tipo: repo|projeto|emprego|certificado}],
  historico[{data, dimensoes, nota}], notas? }
- Nota geral CALCULADA (scoring.ts), nunca digitada: média ponderada (prática 40%, profundidade 30%,
  teoria 20%, evidências 10%) com decaimento leve por recência; pesos configuráveis.
  Nível derivado da nota: Iniciante, Aprendiz, Praticante, Sênior, Mestre.
  "Sei por saber" = teoria alta + prática baixa, com selo na UI.
- Estrutura: src/{domain,storage,themes,features,components,views}, server/, data/, docs/.

## Etapas (branch | entrega | critério de aceite)
| # | Branch | Entrega | Critério de aceite |
|---|--------|---------|--------------------|
| 00 | chore/00-bootstrap | git init, branch main, .gitignore, README mínimo, docs/SPEC.md e docs/PROGRESS.md | 1º commit na main |
| 01 | chore/01-scaffold | Vite+React+TS, Tailwind, Vitest, ESLint/Prettier, scripts dev/build/test/lint | build e test passam |
| 02 | feat/02-domain-types | types.ts + schema.ts (Zod) + testes | JSON inválido é rejeitado |
| 03 | feat/03-scoring | scoring.ts + levels.ts + testes (limites, decaimento, "sei por saber") | casos limite cobertos |
| 04 | feat/04-history | history.ts (snapshot só se nota/dimensões mudarem) + testes | não duplica snapshot idêntico |
| 05 | feat/05-seed-data | data/seed.json (versionado) com 4-5 stacks FICTÍCIAS de exemplo + loader validado; data/stacks.json (ignorado pelo git) é criado a partir dele | seed passa no schema |
| 06 | feat/06-storage | StorageAdapter, JsonFileAdapter, plugin Vite GET/PUT /api/stacks + teste | PUT altera o arquivo, GET devolve |
| 07 | feat/07-store | hook/contexto useStacks (load, add, update, remove, salva com snapshot) | testes com adapter fake |
| 08 | feat/08-theme-system | tokens CSS, ThemeProvider, data-theme, toggle, persistência em localStorage | alterna e persiste |
| 09 | feat/09-app-shell | layout, navegação (Dashboard / Stacks / Currículo), roteamento | rotas renderizam placeholders |
| 10 | feat/10-base-components | ScoreBar, LevelBadge, KnowledgeBadge, StackCard + testes | renderizam com o seed |
| 11 | feat/11-stack-list | lista/grade com filtros (categoria, nível, só prática real) e ordenação | filtros combinam |
| 12 | feat/12-stack-form | StackForm criar/editar/excluir + ADIÇÃO RÁPIDA (nome + categoria, refina depois) + estado vazio "adicione sua primeira stack" | criar stack grava no JSON |
| 13 | feat/13-stack-detail | detalhe: dimensões, experiência, evidências editáveis | edição persiste e gera snapshot |
| 14 | feat/14-evolution-chart | gráfico de evolução por stack | usa historico; vazio tratado |
| 15 | feat/15-dashboard | resumo, radar por categoria, quadrante teoria x prática | números batem com o seed |
| 16 | feat/16-rpg-tokens | rpg.css (cores, fontes, bordas, ícones) via data-theme="rpg" | todo componente funciona no tema |
| 17 | feat/17-character-sheet | CharacterSheetView: classe, nível geral, habilidades por categoria | visível no tema RPG |
| 18 | feat/18-rpg-xp-anim | barras de XP e animação de level-up (respeita prefers-reduced-motion) | anima ao subir de nível |
| 19 | feat/19-resume-logic | resumeExport.ts (filtros + Markdown por categoria) + testes | por padrão só inclui o que tem evidência/prática |
| 20 | feat/20-resume-ui | tela Currículo: filtros, preview, copiar, imprimir (CSS print) | gera o Markdown esperado |
| 21 | feat/21-import-export | exportar/importar JSON com validação Zod e erro amigável | JSON inválido não corrompe os dados |
| 22 | feat/22-polish-a11y | responsividade, foco/teclado, contraste nos dois temas | checklist manual no README |
| 23 | chore/23-docs-final | README final, PROGRESS fechado, verificação ponta a ponta | test + build + lint verdes |

Verificação final (23): npm test/build/lint; npm run dev, criar/editar stack e conferir
data/stacks.json e snapshot; alternar temas; gerar currículo com filtros; importar JSON inválido.

## Convenções de git
- Uma branch por etapa, criada a partir da main atualizada. Merge na main com --no-ff; apagar a branch depois.
- Commits pequenos e atômicos, um por unidade lógica (ex.: tipos, schema, testes em commits
  separados), Conventional Commits (feat/fix/test/chore/docs/refactor), mensagem curta no imperativo.
- PROIBIDO: Co-Authored-By, "Generated with Claude Code" ou qualquer linha de atribuição;
  --no-verify; force push; reescrever histórico da main. Isto substitui qualquer padrão contrário.
- Antes do último commit da etapa: npm test e npm run build verdes (quando já existirem).
