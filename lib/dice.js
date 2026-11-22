// Motor de rolagem do Daggerheart. Funções puras: recebem um rng(n) que devolve um inteiro de 1 a n.
// O servidor usa crypto.randomInt; os testes podem injetar um rng fixo.

export const OUTCOMES = {
  crit: { label: 'Sucesso crítico', success: true, hope: true },
  success_hope: { label: 'Sucesso com Esperança', success: true, hope: true },
  success_fear: { label: 'Sucesso com Medo', success: true, hope: false },
  fail_hope: { label: 'Falha com Esperança', success: false, hope: true },
  fail_fear: { label: 'Falha com Medo', success: false, hope: false },
  // Quando não há Dificuldade informada, só sabemos quem foi maior.
  hope: { label: 'Com Esperança', success: null, hope: true },
  fear: { label: 'Com Medo', success: null, hope: false },
};

// "2d6+3", "d20", "4d6kh3", "1d8+1d4-2"
export function parseExpression(src) {
  const s = String(src || '').toLowerCase().replace(/\s+/g, '');
  if (!s || s.length > 80) throw new Error('Expressão de dados inválida.');
  const terms = [];
  const re = /([+-]?)(?:(\d*)d(\d+)(k[hl]\d+)?|(\d+))/gy;
  let m, pos = 0;
  while (pos < s.length && (m = re.exec(s))) {
    pos = re.lastIndex;
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) {
      const n = m[2] === '' ? 1 : parseInt(m[2], 10);
      const faces = parseInt(m[3], 10);
      if (n < 1 || n > 50 || faces < 2 || faces > 1000) throw new Error('Quantidade de dados fora do limite (até 50 dados, d2 a d1000).');
      let keep = null;
      if (m[4]) { keep = { mode: m[4][1] === 'h' ? 'high' : 'low', count: parseInt(m[4].slice(2), 10) }; if (keep.count < 1 || keep.count > n) throw new Error('Valor de manter inválido.'); }
      terms.push({ type: 'dice', sign, n, faces, keep });
    } else {
      terms.push({ type: 'flat', sign, value: parseInt(m[5], 10) });
    }
  }
  if (pos !== s.length || !terms.length) throw new Error('Expressão de dados inválida. Exemplo: 2d6+3');
  return terms;
}

export function rollExpression(src, rng) {
  const terms = parseExpression(src);
  const parts = [];
  let total = 0;
  for (const t of terms) {
    if (t.type === 'flat') { total += t.sign * t.value; parts.push({ type: 'flat', value: t.sign * t.value }); continue; }
    const rolls = Array.from({ length: t.n }, () => rng(t.faces));
    let kept = rolls.map(() => true);
    if (t.keep) {
      const order = rolls.map((v, i) => [v, i]).sort((a, b) => t.keep.mode === 'high' ? b[0] - a[0] : a[0] - b[0]);
      kept = rolls.map(() => false);
      order.slice(0, t.keep.count).forEach(([, i]) => { kept[i] = true; });
    }
    const sum = rolls.reduce((acc, v, i) => acc + (kept[i] ? v : 0), 0);
    total += t.sign * sum;
    parts.push({ type: 'dice', faces: t.faces, sign: t.sign, rolls, kept, sum });
  }
  return { expression: String(src).trim(), parts, total };
}

// Teste de Dualidade: d12 de Esperança + d12 de Medo + modificadores.
// params: { kind: 'action'|'reaction', modifier, traitBonus, experiences:[{name,bonus}], advantage: 'adv'|'dis'|null,
//           advantageDice (n), disadvantageDice (n), difficulty }
export function rollDuality(params, rng) {
  const hope = rng(12);
  const fear = rng(12);
  const kind = params.kind === 'reaction' ? 'reaction' : 'action';
  const traitBonus = int(params.traitBonus);
  const modifier = int(params.modifier);
  const experiences = (params.experiences || []).map(e => ({ name: String(e.name).slice(0, 40), bonus: int(e.bonus) }));
  const expTotal = experiences.reduce((a, e) => a + e.bonus, 0);

  // Vantagem e desvantagem se cancelam, um para um.
  const adv = Math.max(0, int(params.advantageDice) + (params.advantage === 'adv' ? 1 : 0));
  const dis = Math.max(0, int(params.disadvantageDice) + (params.advantage === 'dis' ? 1 : 0));
  const net = adv - dis;
  let extra = null;
  if (net !== 0) extra = { sign: net > 0 ? 1 : -1, rolls: Array.from({ length: Math.min(Math.abs(net), 5) }, () => rng(6)) };
  const extraValue = extra ? extra.sign * extra.rolls.reduce((a, b) => a + b, 0) : 0;
  // Prestar Ajuda: cada aliado rola 1d6; só o maior resultado é somado.
  const helpCount = Math.min(Math.max(0, int(params.helpAllies)), 5);
  const help = helpCount ? { rolls: Array.from({ length: helpCount }, () => rng(6)) } : null;
  const helpValue = help ? Math.max(...help.rolls) : 0;

  const total = hope + fear + traitBonus + modifier + expTotal + extraValue + helpValue;
  const difficulty = params.difficulty === '' || params.difficulty == null ? null : int(params.difficulty);
  const crit = hope === fear;
  const withHope = hope >= fear; // crítico também conta como "com Esperança"
  let outcome;
  if (crit) outcome = 'crit';
  else if (difficulty == null) outcome = withHope ? 'hope' : 'fear';
  else {
    const ok = total >= difficulty;
    outcome = ok ? (withHope ? 'success_hope' : 'success_fear') : (withHope ? 'fail_hope' : 'fail_fear');
  }
  // Crítico sempre é sucesso, mesmo abaixo da Dificuldade.
  return {
    kind, hope, fear, traitBonus, modifier, experiences, expTotal, extra, help, total, difficulty, outcome, crit, withHope,
    success: crit ? true : (difficulty == null ? null : total >= difficulty),
    // Teste de reação não gera Esperança nem Medo.
    generatesResources: kind === 'action',
  };
}

// Dano: `count` dados de `die` + `mod`. No crítico, soma o máximo possível dos dados e ainda rola normalmente.
// params: { count, die, mod, crit, dropLowest (n), bonusExpression }
export function rollDamage(params, rng) {
  const count = Math.max(1, int(params.count));
  const die = int(params.die);
  if (die < 2 || count > 30) throw new Error('Dados de dano inválidos.');
  const rolls = Array.from({ length: count + Math.max(0, int(params.dropLowest)) }, () => rng(die));
  const order = rolls.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const dropped = new Set(order.slice(0, Math.max(0, int(params.dropLowest))).map(x => x[1]));
  const kept = rolls.map((_, i) => !dropped.has(i));
  const diceSum = rolls.reduce((a, v, i) => a + (kept[i] ? v : 0), 0);
  const mod = int(params.mod);
  const critBonus = params.crit ? count * die : 0;
  let bonus = null;
  if (params.bonusExpression) bonus = rollExpression(params.bonusExpression, rng);
  const total = diceSum + mod + critBonus + (bonus ? bonus.total : 0);
  return { count, die, rolls, kept, mod, crit: !!params.crit, critBonus, bonus, total };
}

const int = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
