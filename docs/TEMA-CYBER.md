# Tema Cyber: plano, checklist e decisões

Memória compartilhada entre as tarefas do tema "Cyber". Toda tarefa lê este arquivo primeiro
(seções 2, Decisões e Pendências) e anota aqui, em uma linha, qualquer decisão que afete tarefas
futuras.

## 1. Objetivo e regras

**Objetivo:** adicionar ao Painel de Stacks um terceiro tema, `cyber`: estrutura de HUD do SAO
(painéis de vidro, "mensagem do sistema") com neon cyberpunk, sem mudar a aparência dos temas
funcional e rpg.

**Regras:**

- **Nenhum commit pode ter coautor nem atribuição.** Nada de `Co-Authored-By`, `Generated with`
  ou qualquer trailer, em commits normais e de merge, mesmo que o ambiente peça. Depois de cada
  commit, conferir com `git log -1 --format=%B` e corrigir com `git commit --amend` se preciso.
- Mensagens em inglês, conventional commits em minúsculas (`feat:`, `fix:`, `refactor:`, `test:`,
  `style:`, `docs:`, `build:`, `perf:`).
- Só commitar com o portão verde: `npx prettier --write <arquivos tocados>`, `npm run lint`,
  `npm run test`, `npm run build`, `npm run format:check`.
- `feat/tema-cyber` é a branch de integração, criada a partir da ponta de `feat/22-polish-a11y`.
  Cada etapa ganha sua branch a partir de `feat/tema-cyber` e volta com
  `git merge --no-ff <branch> -m "merge: etapa NN - <nome>"`, sem trailer.
- `main` fica intocada. Nunca `git push`, nunca `--no-verify`, nunca reescrever histórico além do
  amend do último commit, nunca `git reset --hard` em commits feitos. A etapa 22 não é alterada.
- Tarefas que escrevem rodam uma de cada vez; só revisores somente leitura rodam em paralelo.

## 2. Decisões já tomadas (não reabra)

| Tema                  | Decisão                                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direção visual        | Híbrido escuro: a estrutura do SAO (painéis de vidro, "mensagem do sistema", HUD limpo) com neon cyberpunk. O glitch é raro e só aparece em momentos de jogo.                                   |
| Id / rótulo           | `cyber` / `Cyber`                                                                                                                                                                             |
| Arquivo do tema       | `src/themes/cyber.css`, espelhando `src/themes/rpg.css` (mesmos `--theme-*`, tabela de contraste no cabeçalho)                                                                                  |
| Variáveis só do cyber | prefixo `--cyber-*`, nunca `--theme-*` (o teste de paridade não as exige nos outros temas)                                                                                                     |
| Fonte de títulos      | Oxanium via `@fontsource/oxanium`, só latin, só os pesos usados (como a Cinzel no rpg.css)                                                                                                    |
| Números               | novo token `--theme-font-mono`, definido em todos os temas (funcional e rpg mantêm a aparência atual)                                                                                          |
| Gancho de painel      | classe neutra `painel` nos cards de nível de seção. Os outros temas a ignoram.                                                                                                                |
| Temas existentes      | funcional e rpg não mudam de aparência. Só o refactor da etapa 24 mexe neles, sem efeito visual.                                                                                              |
| Seletor de tema       | com 3 temas, o botão que só alterna vira um seletor acessível (radiogroup ou `<select>` com rótulo)                                                                                           |
| Tipo de tema          | config por tema: `{ rotulo, jogo, esquema: 'light' \| 'dark', levelUp: 'pergaminho' \| 'sistema' }` e helper `ehTemaDeJogo(tema)`                                                               |
| Acessibilidade        | texto ≥ 4.5:1, foco/bordas/gráficos ≥ 3:1. `prefers-reduced-motion` desliga toda animação decorativa. `forced-colors: active` desliga enfeites. A impressão continua preto no branco.           |

Paleta de partida para o cyber. O contraste já foi conferido sobre bg, surface e surface-2; quem
ajustar algum valor recalcula:

```
bg #070b14  surface #0d1424  surface-2 #151f35
text #e6f1ff (14.4+)  text-muted #93a8c6 (6.8+)  border #3d7397 (3.2+)
accent #22d3ee  accent-contrast #04121a (10.5 sobre accent, 6.4 sobre danger)
success #34d399  warning #fbbf24  danger #ff5c7a  focus #f472b6 (magenta, contrasta com accent ciano)
level-1..5 (raridade): #9aa7b8  #4ade80  #38bdf8  #c084fc  lendário dourado/laranja ≠ warning
xp-fill #22d3ee  xp-track #12324a (7.35)
glow: 0 0 0 1px rgb(34 211 238 / .7), 0 0 16px 2px rgb(34 211 238 / .4)
radius 0 (chanfro via pseudo-elemento, nunca clip-path no painel: ele corta a sombra e o foco)
```

## 3. Checklist

### Etapa 0: preparação (`feat/tema-cyber`)

- [x] 0.1 Criar `feat/tema-cyber` e este arquivo com plano, checklist, Decisões e Pendências.

### Etapa 24: `refactor/24-theme-registry` (nenhuma mudança visual)

- [ ] 24.1 Trocar `ROTULOS_TEMA` por `CONFIG_TEMAS` e criar `ehTemaDeJogo` em `src/themes/themes.ts`.
- [ ] 24.2 Trocar comparações com `'rpg'` por `ehTemaDeJogo`; `movimento()` recebe o estilo `levelUp`.
- [ ] 24.3 `ThemeToggle` vira seletor acessível com todos os temas; ajustar testes do botão "Tema:".
- [ ] 24.4 Teste que falha se a lista de ids do script anti-flash do `index.html` divergir de `TEMAS`.
- [ ] 24.5 `tokens.test.ts` genérico: todo `src/themes/*.css` define os mesmos `--theme-*` que tokens.css.
- [ ] 24.6 Mover a estrutura das partículas de level-up de `rpg.css` para `efeitos-jogo.css`.
- [ ] 24.R Revisão somente leitura do diff da etapa 24 (regressões e comparações com `'rpg'`).
- [ ] 24.M Merge `merge: etapa 24 - theme registry` em `feat/tema-cyber` e marcar a checklist.

### Etapa 25: `feat/25-cyber-tokens` (o tema existe e tudo funciona nele)

- [ ] 25.1 Token `--theme-font-mono` em tokens.css e rpg.css e mapeamento `--font-mono` no `@theme inline`.
- [ ] 25.2 Criar `src/themes/cyber.css` com a paleta, `color-scheme: dark` e tabela de contraste.
- [ ] 25.3 Validar as séries de gráfico do cyber contra a surface escura, incluindo daltonismo.
- [ ] 25.4 Instalar `@fontsource/oxanium`, importar os pesos usados e definir as fontes do tema.
- [ ] 25.5 Registrar `cyber` em `CONFIG_TEMAS` e no `index.html`; conferir impressão; ajustar testes.
- [ ] 25.6 Criar `src/themes/contraste.test.ts` verificando os contrastes mínimos dos temas.
- [ ] 25.R Revisão de código somente leitura da etapa 25.
- [ ] 25.V Revisão visual da etapa 25 nos três temas (1280px e 375px).
- [ ] 25.M Merge `merge: etapa 25 - cyber tokens` em `feat/tema-cyber`.

### Etapa 26: `feat/26-cyber-hud` (moldura de HUD)

- [ ] 26.1a Classe `painel` nos cards de seção de `src/components` e `src/views`.
- [ ] 26.1b Classe `painel` nos cards de seção de `src/features/dashboard` e `src/features/character`.
- [ ] 26.1c Classe `painel` nos cards de seção de `src/features/stacks`, `resume` e `data`.
- [ ] 26.2 Fundo do cyber: grade sutil, vinheta e scanlines num `body::after`, com as guardas de a11y.
- [ ] 26.3 Moldura `.painel` no cyber: vidro, chanfro, colchetes de canto e brilho no hover.
- [ ] 26.4 Títulos em caixa alta com prefixo `//`, link ativo com barra brilhante e varredura nos botões.
- [ ] 26.R Revisão de código somente leitura da etapa 26.
- [ ] 26.V Revisão visual da etapa 26 nos três temas.
- [ ] 26.M Merge `merge: etapa 26 - cyber hud` em `feat/tema-cyber`.

### Etapa 27: `feat/27-cyber-sheet` (a sensação de jogo)

- [ ] 27.1 XpBar estilo barra de HP do SAO (segmentada, inclinada, `LV N` em `font-mono`).
- [ ] 27.2 Colmeia neon: brilho por raridade, pulso no lendário, anel no selecionado, selo holográfico.
- [ ] 27.3 Radar com grade ciano e polígono com `drop-shadow`; tooltip do hex com `// SKILL DATA`.
- [ ] 27.4 Level-up "mensagem do sistema" (`levelUp: 'sistema'`) com faixa, glitch único e riscos de luz.
- [ ] 27.5 (opcional) Painéis materializam em sequência ao trocar de rota nos temas de jogo.
- [ ] 27.R Revisão de código somente leitura da etapa 27.
- [ ] 27.V Revisão visual da etapa 27 nos três temas.
- [ ] 27.M Merge `merge: etapa 27 - cyber sheet` em `feat/tema-cyber`.

### Etapa final (`feat/tema-cyber`)

- [ ] F.1 Atualizar `docs/PROGRESS.md` (linhas 24 a 27) e a seção "Como adicionar um tema" no README.
- [ ] F.2 Revisão final: build, testes, lint, formato e varredura de trailers vazia.

## Decisões

- Trabalho feito num git worktree em C:\Users\gabdo\Desktop\dev\stacks-tema-cyber porque a pasta
  principal tinha alterações não commitadas da etapa 22; assim a etapa 22 não é alterada nem
  misturada ao tema.

## Pendências
