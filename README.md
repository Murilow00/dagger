# Mesa de Daggerheart

Gerenciador de campanhas online de Daggerheart em **Next.js 15** (App Router).

## Recursos
- Criação de ficha com validação das regras (atributos, equipamento, experiências, cartas) e subida de nível (incluindo multiclasse).
- Ficha em duas cores: cor da classe + cor do antecedente (comunidade, com troca manual).
- Rolagens dinâmicas (Dualidade, dano, expressões como `2d6+3`) com animação dos dados sobre a tela.
- Biblioteca de cartas, armas (comuns e mágicas separadas), armaduras, itens etc.; bestiário de adversários e ambientes.
- Campanhas com link de convite; as rolagens de todos aparecem em tempo real (consulta leve a cada ~2,5 s).
- Menu do mestre visível e acessível somente a quem criou a campanha (Medo, encontros, rolagens ocultas, notas, expulsar jogadores).

## Como rodar
```bash
npm install
npm run dev            # desenvolvimento em http://localhost:3000
npm run build && npm start   # produção
```

## Publicar na Vercel
1. Suba o projeto para um repositório no GitHub e importe-o na Vercel (framework: Next.js, sem configuração extra).
2. No projeto da Vercel, abra **Storage → Marketplace → Upstash for Redis**, crie o banco (plano gratuito serve) e conecte ao projeto. A Vercel cria as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` (também funcionam `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`).
3. Faça o deploy. Pronto: contas, fichas e campanhas ficam no Redis e o link de convite funciona para qualquer pessoa.

Como funciona: cada requisição carrega os registros, executa a regra e grava só o que mudou, com checagem de conflito por registro (se dois jogadores alteram o mesmo registro ao mesmo tempo, a requisição é refeita). O tempo real é uma consulta de 1 comando a cada ~2,5 s por quem está na mesa (8 s com a aba em segundo plano); quando algo muda, o cliente busca só as rolagens novas ou recarrega a campanha. Rolagens guardam as últimas 300 por campanha.

Limites a conhecer: o banco é carregado por inteiro a cada requisição (ótimo para mesas de amigos, não para milhares de usuários); a proteção contra tentativas de login é por instância; o plano gratuito do Upstash tem cota mensal de comandos (uma mesa de 5 pessoas por 3 horas usa na casa de 20 mil).

## Rodar em servidor próprio ou localmente
Sem as variáveis do Redis, o sistema usa um arquivo JSON (`DATA_FILE`, padrão `.data/db.json`). Serve para desenvolvimento e para um único servidor Node (Railway, Render, Fly.io com volume persistente).

## Variáveis de ambiente
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`): ativam o Redis.
- `DATA_FILE`: caminho do banco JSON quando não há Redis.
- `COOKIE_SECURE`: por padrão é `true` em produção. Use `false` apenas para rodar `next start` em http local.

## Dados do SRD e tradução (pt-BR)
- `data-src/srd.en.json`: SRD 1.0 em inglês, gerado por `npm run build:srd -- <pasta do SRD em markdown>`.
- `data-src/pt/translations.json`: dicionário inglês → português (3.254 textos) e `data-src/pt/GLOSSARY.md` com os termos usados.
- `npm run build:pt` junta os dois e gera `public/data/srd.json`, que o sistema usa. Os campos `id` continuam em inglês; `name` e os textos ficam em português.
- Para ajustar uma tradução, edite o dicionário e rode `npm run build:pt`. A tradução não é oficial: confira com o livro da Jambô.

## Testes
`npm run test:rules` (regras) e `node scripts/test-api.mjs` com o servidor rodando (`BASE=http://localhost:3000`).
Para testar o backend Redis sem internet: `redis-server --port 6390 --daemonize yes`, `node scripts/redis-rest-shim.mjs` e inicie o Next com `UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079 UPSTASH_REDIS_REST_TOKEN=test`.

## Licença / atribuição
Este produto inclui materiais do Daggerheart System Reference Document 1.0, © Critical Role, LLC, sob a Darrington Press Community Gaming (DPCGL) License. Projeto de fãs, sem afiliação com a Critical Role ou a Darrington Press.
