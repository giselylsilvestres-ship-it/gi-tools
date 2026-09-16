// Camada de desafios de escrita: filtra temas sem alterar o peso das categorias.
const WRITING_CHALLENGES = {
  "Precisão lexical": {
    tip: "Procure a palavra exata. Quando surgir uma expressão genérica como ‘bom’, ‘ruim’, ‘coisa’, ‘muito’, ‘legal’ ou ‘fazer’, pergunte: o que exatamente quero dizer? Não troque por uma palavra mais sofisticada — troque por uma mais precisa."
  },
  "Elaboração": {
    tip: "Segure a conclusão. Antes de dizer o que algo significou, mostre contexto, detalhes, acontecimentos ou evidências suficientes para o leitor percorrer o caminho com você."
  },
  "Sintaxe & ritmo": {
    tip: "Varie deliberadamente a arquitetura das frases. Misture períodos curtos e longos, coordenação e subordinação, pausas e repetições intencionais. Evite construir todas as frases do mesmo jeito."
  }
};

PROMPTS["Elaboração e storytelling"] = [
  "Conte uma situação em que alguém te irritou sem dizer de início que você ficou irritada. Reconstrua a cena até isso ficar perceptível.",
  "Conte uma história engraçada sem começar pelo que a torna engraçada. Construa o caminho até a virada.",
  "Pense em uma decisão importante que você tomou. Reconstrua três momentos que levaram à decisão antes de contar qual foi.",
  "Conte algo que deu errado: o que você esperava, o primeiro sinal de que não aconteceria e o momento em que percebeu o problema.",
  "Descreva uma pessoa de quem você gosta por meio de uma história concreta, sem listar as qualidades dela.",
  "Conte uma discussão sem dizer quem estava certo. Mostre o que aconteceu e deixe sua interpretação para o final."
];
CATEGORY_SKILLS["Elaboração e storytelling"] = "Treinar desenvolvimento de ideias, construção de cenas, progressão narrativa e capacidade de conduzir o leitor até uma conclusão.";

const PROMPT_CHALLENGES = {
  "Memória e descrição": [
    ["Precisão lexical", "Elaboração"], ["Elaboração", "Sintaxe & ritmo"], ["Precisão lexical", "Elaboração"], ["Elaboração", "Sintaxe & ritmo"],
    ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração", "Sintaxe & ritmo"], ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração"]
  ],
  "Explicação": [
    ["Precisão lexical", "Elaboração", "Sintaxe & ritmo"], ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração"], ["Elaboração", "Sintaxe & ritmo"]
  ],
  "Opinião": [
    ["Elaboração", "Sintaxe & ritmo"], ["Elaboração"], ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração", "Sintaxe & ritmo"]
  ],
  "Argumentação": [
    ["Elaboração", "Sintaxe & ritmo"], ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração", "Sintaxe & ritmo"]
  ],
  "Síntese": [
    ["Precisão lexical", "Sintaxe & ritmo"], ["Precisão lexical", "Sintaxe & ritmo"], ["Precisão lexical"]
  ],
  "Criatividade": [
    ["Elaboração", "Sintaxe & ritmo"], ["Precisão lexical", "Elaboração"], ["Elaboração", "Sintaxe & ritmo"]
  ],
  "Registro emocional": [
    ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração"]
  ],
  "Livre": [["Precisão lexical", "Elaboração", "Sintaxe & ritmo"]],
  "Elaboração e storytelling": [
    ["Precisão lexical", "Elaboração", "Sintaxe & ritmo"], ["Elaboração", "Sintaxe & ritmo"], ["Elaboração", "Sintaxe & ritmo"],
    ["Precisão lexical", "Elaboração"], ["Precisão lexical", "Elaboração", "Sintaxe & ritmo"], ["Elaboração", "Sintaxe & ritmo"]
  ]
};

let selectedChallenges = new Set();

function challengeTagsFor(category, prompt) {
  const index = (PROMPTS[category] || []).indexOf(prompt);
  return (PROMPT_CHALLENGES[category] || [])[index] || [];
}

function challengeMatches(category, prompt) {
  if (!selectedChallenges.size) return true;
  const tags = challengeTagsFor(category, prompt);
  return [...selectedChallenges].some(challenge => tags.includes(challenge));
}

function renderChallengeTips() {
  const box = document.getElementById('challengeTips');
  if (!box) return;
  if (!selectedChallenges.size) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = [...selectedChallenges].map(name => `<div class="challenge-tip"><strong>${esc(name)}</strong><span>${esc(WRITING_CHALLENGES[name].tip)}</span></div>`).join('');
}

function populateChallenges() {
  const wrap = document.getElementById('challengePills');
  if (!wrap) return;
  const names = ['Todos', ...Object.keys(WRITING_CHALLENGES)];
  wrap.innerHTML = names.map(name => `<button type="button" class="category-pill ${name === 'Todos' ? 'active' : ''}" data-challenge="${name}">${name}</button>`).join('');
  wrap.querySelectorAll('[data-challenge]').forEach(btn => btn.onclick = () => {
    const name = btn.dataset.challenge;
    if (name === 'Todos') selectedChallenges.clear();
    else selectedChallenges.has(name) ? selectedChallenges.delete(name) : selectedChallenges.add(name);
    wrap.querySelectorAll('[data-challenge]').forEach(b => {
      const x = b.dataset.challenge;
      b.classList.toggle('active', x === 'Todos' ? selectedChallenges.size === 0 : selectedChallenges.has(x));
    });
    renderChallengeTips();
    if (document.getElementById('promptCard')) document.getElementById('promptCard').hidden = true;
  });
}

// Substitui apenas o sorteio: categorias continuam com peso igual; desafio é um filtro adicional.
choosePrompt = function() {
  const pool = selectedCategories.size ? [...selectedCategories] : Object.keys(PROMPTS);
  const recent = getRecent();
  const eligibleCategories = pool.filter(category => (PROMPTS[category] || []).some(prompt => challengeMatches(category, prompt)));
  const categoryPool = eligibleCategories.length ? eligibleCategories : pool;
  const category = randomItem(categoryPool);
  let candidates = (PROMPTS[category] || []).filter(prompt => challengeMatches(category, prompt) && !recent.includes(`${category}::${prompt}`));
  if (!candidates.length) candidates = (PROMPTS[category] || []).filter(prompt => challengeMatches(category, prompt));
  if (!candidates.length) candidates = [...(PROMPTS[category] || [])];
  const prompt = randomItem(candidates);
  currentPrompt = {category, prompt, challenges: challengeTagsFor(category, prompt).filter(x => !selectedChallenges.size || selectedChallenges.has(x))};
  recent.push(`${category}::${prompt}`);
  setRecent(recent);
  return currentPrompt;
};

// Acrescenta os controles sem mudar a estrutura existente da Home.
(function installChallengeUI(){
  const categoryField = document.getElementById('categoryPills')?.closest('.field');
  if (!categoryField) return;
  const field = document.createElement('div');
  field.className = 'field challenge-field';
  field.innerHTML = '<label>Desafio</label><div id="challengePills" class="category-pills" role="group" aria-label="Desafio"></div><div id="challengeTips" class="challenge-tips" hidden></div>';
  categoryField.insertAdjacentElement('afterend', field);

  const style = document.createElement('style');
  style.textContent = `.challenge-field{margin-top:20px}.challenge-tips{margin-top:12px;display:grid;gap:8px}.challenge-tips[hidden]{display:none}.challenge-tip{padding:12px 14px;border:1px solid var(--border,#dedede);border-radius:12px;background:var(--surface,#fff);font-size:13px;line-height:1.45}.challenge-tip strong{display:block;margin-bottom:4px}.challenge-tip span{opacity:.76}`;
  document.head.appendChild(style);

  populateCategories();
  populateChallenges();
})();