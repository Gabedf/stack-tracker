# Painel de Stacks

Painel local para registrar e avaliar o domínio de cada stack/tecnologia, com nota calculada a partir de dimensões
(teoria, prática, profundidade, evidências), histórico de evolução e exportação para currículo.

- Especificação: [docs/SPEC.md](docs/SPEC.md)
- Progresso: [docs/PROGRESS.md](docs/PROGRESS.md)

## Temas

O painel tem três temas: funcional, rpg e cyber. Para ver o Cyber, rode `npm run dev` e escolha "Cyber" no seletor de tema
do cabeçalho. A visão geral e as decisões do tema estão em [docs/TEMA-CYBER.md](docs/TEMA-CYBER.md).

## Como adicionar um tema

1. Registre o id em `TEMAS` e a config (`rotulo`, `jogo`, `esquema`, `levelUp`) em `CONFIG_TEMAS`, em `src/themes/themes.ts`.
2. Crie `src/themes/<id>.css` com o bloco `[data-theme='<id>']` e os mesmos `--theme-*` de `src/themes/tokens.css`, e importe o
   arquivo em `src/index.css`.
3. Acrescente o id em `var temas = [...]` no script anti-flash do `index.html`.
4. Os testes que guardam a paridade precisam passar:
   - `src/themes/tokens.test.ts`: todo tema define os mesmos `--theme-*`;
   - `src/themes/contraste.test.ts`: contrastes mínimos e `color-scheme` igual ao `esquema` da config;
   - `src/themes/antiFlash.test.ts`: a lista do `index.html` é igual a `TEMAS`;
   - `src/themes/themes.test.ts`: o registro e os helpers de `themes.ts`.
5. Variáveis só do tema usam o prefixo `--<id>-*`, nunca `--theme-*`.
6. No HTML ficam só ganchos neutros (a classe `painel`, data-atributos); o estilo de cada tema fica no CSS dele. Animação vai atrás
   de `prefers-reduced-motion: no-preference`, e os enfeites são desligados em `forced-colors: active` e na impressão.
