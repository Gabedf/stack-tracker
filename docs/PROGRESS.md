# Progresso — Painel de Stacks

Para retomar: leia este arquivo, confira `git log --oneline -n 15` e continue da primeira etapa não concluída.

| Etapa | Branch | Status | Merge |
|-------|--------|--------|-------|
| 00 | chore/00-bootstrap | concluída | 31e854f |
| 01 | chore/01-scaffold | concluída | 0451f53 |
| 02 | feat/02-domain-types | concluída | 40accd3 |
| 03 | feat/03-scoring | concluída | e90c4b6 |
| 04 | feat/04-history | concluída | 076425a |
| 05 | feat/05-seed-data | concluída | 55e340d |
| 06 | feat/06-storage | concluída | b12b8f8 |
| 07 | feat/07-store | concluída | 15fa412 |
| 08 | feat/08-theme-system | concluída | db9217b |
| 09 | feat/09-app-shell | concluída | a570c66 |
| 10 | feat/10-base-components | concluída | 85e922c |
| 11 | feat/11-stack-list | concluída | c1c7ce8 |
| 12 | feat/12-stack-form | concluída | 05998e6 |
| 13 | feat/13-stack-detail | concluída | 124fb0d |
| 14 | feat/14-evolution-chart | concluída | ed7875a |
| 15 | feat/15-dashboard | pendente | |
| 16 | feat/16-rpg-tokens | pendente | |
| 17 | feat/17-character-sheet | pendente | |
| 18 | feat/18-rpg-xp-anim | pendente | |
| 19 | feat/19-resume-logic | pendente | |
| 20 | feat/20-resume-ui | pendente | |
| 21 | feat/21-import-export | pendente | |
| 22 | feat/22-polish-a11y | pendente | |
| 23 | chore/23-docs-final | pendente | |

## Pendências para etapas futuras

- (22) Code splitting por rota com React.lazy: o recharts levou o bundle a ~800 kB (aviso do Vite > 500 kB).
- (22) Tooltip do gráfico de evolução não abre por teclado; os valores ficam na tabela alternativa.
- (geral) npm audit: tinypool via Vitest 3 (só dev). A correção exige Vitest 4 e Node >= 20.19.
