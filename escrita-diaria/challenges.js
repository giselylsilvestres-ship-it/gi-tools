// Camada de treino da Escrita Diária. Expande o catálogo sem apagar nenhum tema anterior.
const ORIGINAL_PROMPTS = Object.fromEntries(Object.entries(PROMPTS).map(([k,v])=>[k,[...v]]));

const EXPANDED_PROMPTS = {
  "Memória e descrição": [
    ...ORIGINAL_PROMPTS["Memória e descrição"],
    "Descreva um cheiro que imediatamente te leva para outro momento da vida.",
    "Descreva um lugar onde você se sente completamente segura.",
    "Conte como era um domingo da sua infância.",
    "Descreva um momento de silêncio que ficou na memória.",
    "Descreva uma refeição inesquecível.",
    "Reconstrua um trajeto que você fazia com frequência.",
    "Descreva sua escola sem dizer o nome dela.",
    "Conte uma lembrança envolvendo chuva.",
    "Descreva uma viagem por pequenos detalhes, não pelos pontos turísticos.",
    "Descreva um momento em que observou alguém sem conversar com essa pessoa.",
    "Descreva um ambiente apenas pelos sons.",
    "Descreva sua casa atual como se um desconhecido fosse entrar nela amanhã."
  ],
  "Explicação": [
    ...ORIGINAL_PROMPTS["Explicação"],
    "Explique o que é cultura organizacional para alguém que nunca trabalhou em uma empresa.",
    "Explique como funciona um hábito.",
    "Explique o conceito de autonomia.",
    "Explique o que significa liderança para você.",
    "Explique um erro comum sobre um assunto que você domina.",
    "Explique como você aprende algo novo.",
    "Explique inteligência artificial para alguém que nunca usou uma ferramenta de IA.",
    "Explique o que faz uma boa reunião.",
    "Explique por que feedback costuma dar errado.",
    "Explique um conceito usando uma metáfora como fio condutor.",
    "Explique algo sem usar jargões.",
    "Explique o mesmo conceito primeiro para uma criança e depois para um CEO.",
    "Explique um processo passo a passo.",
    "Explique um tema usando um exemplo concreto.",
    "Explique uma ideia difícil em menos de 300 palavras.",
    "Explique um conceito começando pelo problema que ele resolve."
  ],
  "Opinião": [
    ...ORIGINAL_PROMPTS["Opinião"],
    "O que você mudou completamente de ideia nos últimos anos?",
    "Existe equilíbrio entre carreira e vida pessoal?",
    "O que é sucesso para você?",
    "Vale a pena perseguir excelência?",
    "Todo mundo se beneficiaria de fazer terapia?",
    "De qual conselho popular você discorda?",
    "Qual hábito é superestimado?",
    "O que a internet melhorou na sua vida?",
    "O que a internet piorou na sua vida?",
    "O que significa ser inteligente?",
    "Você acredita em talento?",
    "Qual comportamento você mais admira nas pessoas?",
    "Qual comportamento você tolera menos?",
    "Existe momento certo para ter filhos?",
    "O que significa maturidade para você?",
    "Escreva sobre uma opinião que você ainda está construindo."
  ],
  "Argumentação": [
    ...ORIGINAL_PROMPTS["Argumentação"],
    "Convença alguém a ler um livro de que você gostou muito.",
    "Convença alguém a mudar um hábito.",
    "Explique por que alguém razoável poderia discordar de você.",
    "Defenda uma decisão impopular que você tomou.",
    "Construa o melhor argumento contra o perfeccionismo.",
    "Construa o melhor argumento a favor do perfeccionismo.",
    "Defenda uma mudança difícil para um gestor que está resistente a ela.",
    "Convença um amigo a fazer uma viagem que você considera especial.",
    "Defenda uma ideia usando principalmente exemplos concretos.",
    "Defenda uma ideia sem recorrer a exemplos pessoais.",
    "Escolha um tema e construa tese, evidências e conclusão.",
    "Escreva um argumento que antecipe as principais objeções do leitor.",
    "Tente convencer alguém que parte de uma premissa diferente da sua.",
    "Construa um argumento usando uma analogia.",
    "Combine dados e experiência pessoal para sustentar uma ideia.",
    "Explique por que uma boa ideia pode falhar.",
    "Construa um argumento em cinco etapas, sem pular nenhuma delas."
  ],
  "Síntese": [
    ...ORIGINAL_PROMPTS["Síntese"],
    "Resuma uma conversa importante.",
    "Resuma seu trabalho para alguém em um parágrafo.",
    "Resuma um filme em cinco frases.",
    "Explique uma decisão em até 100 palavras.",
    "Resuma um aprendizado do último mês.",
    "Resuma um artigo que você lembra sem consultar a fonte.",
    "Escreva uma biografia sua em até 150 palavras.",
    "Resuma uma viagem em um parágrafo.",
    "Explique um conceito em três frases.",
    "Resuma um conflito sem perder os dois lados.",
    "Transforme um assunto complexo em um único insight central.",
    "Escreva a versão TL;DR de um problema que você está vivendo.",
    "Escreva um resumo executivo de um assunto do seu trabalho.",
    "Explique uma ideia usando exatamente 50 palavras.",
    "Resuma um episódio da sua semana.",
    "Resuma um aprendizado técnico recente.",
    "Resuma um livro em uma frase."
  ],
  "Criatividade": [
    ...ORIGINAL_PROMPTS["Criatividade"],
    "Imagine sua vida em outra profissão.",
    "Crie um personagem inesquecível e apresente-o em uma cena.",
    "Escreva um diálogo entre duas versões suas.",
    "Invente uma cidade e descreva uma regra estranha dela.",
    "Escreva uma história contada por um objeto.",
    "Imagine que você acordou dez anos no futuro.",
    "Imagine uma conversa com você aos oito anos.",
    "Invente um feriado e explique como ele é celebrado.",
    "Crie uma regra absurda para o mundo e mostre suas consequências.",
    "Escreva uma história em que ninguém fala.",
    "Escreva uma carta que será encontrada cem anos depois.",
    "Reescreva um conto conhecido mudando uma decisão central.",
    "Crie um pequeno mistério.",
    "Crie uma invenção impossível e mostre alguém usando-a.",
    "Imagine um mundo sem internet.",
    "Imagine um mundo em que todos lembram de tudo.",
    "Escreva um final alternativo para um livro que você leu."
  ],
  "Registro emocional": [
    ...ORIGINAL_PROMPTS["Registro emocional"],
    "Qual emoção apareceu mais hoje? O que parece ter provocado isso?",
    "O que te deu energia hoje?",
    "O que drenou sua energia hoje?",
    "Escreva sobre um medo atual sem tentar resolvê-lo.",
    "Escreva sobre um orgulho recente.",
    "Escreva sobre algo que você ainda não aceitou.",
    "O que você gostaria de dizer para alguém, mesmo que nunca diga?",
    "Qual conversa ainda continua dentro de você?",
    "Do que você sente falta hoje?",
    "O que você sente que mudou em você?",
    "O que você gostaria de proteger neste momento?",
    "Escreva sobre um momento em que se sentiu vista.",
    "Escreva sobre um momento em que se sentiu invisível.",
    "O que você está tentando controlar?",
    "Em que você gostaria de conseguir confiar mais?",
    "Escreva sobre uma insegurança sem tentar corrigi-la.",
    "Qual emoção você gostaria de sentir mais?"
  ],
  "Elaboração e storytelling": [
    "Conte uma situação em que alguém te irritou sem dizer de início que você ficou irritada. Reconstrua a cena até isso ficar perceptível.",
    "Conte uma história engraçada sem começar pelo que a torna engraçada. Construa o caminho até a virada.",
    "Pense em uma decisão importante que você tomou. Reconstrua três momentos que levaram à decisão antes de contar qual foi.",
    "Conte algo que deu errado: o que você esperava, o primeiro sinal de que não aconteceria e o momento em que percebeu o problema.",
    "Descreva uma pessoa de quem você gosta por meio de uma história concreta, sem listar as qualidades dela.",
    "Conte uma discussão sem dizer quem estava certo. Mostre o que aconteceu e deixe sua interpretação para o final.",
    "Conte um momento em que você mudou de ideia sem revelar a mudança logo no início.",
    "Conte uma história que começou de um jeito completamente comum e ganhou importância aos poucos.",
    "Descreva um encontro marcante usando acontecimentos e diálogos antes de explicar o que ele significou.",
    "Conte um erro mostrando primeiro o que você esperava que acontecesse.",
    "Conte um momento em que percebeu algo importante em tempo real.",
    "Escreva sobre alguém que você admira usando uma única história concreta.",
    "Conte um momento de tensão e permaneça na cena antes de chegar à resolução.",
    "Escreva uma história inteira concentrada em uma única cena.",
    "Conte um momento feliz sem usar as palavras ‘feliz’, ‘bom’ ou ‘especial’.",
    "Conte um momento triste sem usar as palavras ‘triste’, ‘mal’ ou ‘difícil’.",
    "Reescreva uma lembrança como se fosse um capítulo curto de um livro.",
    "Conte uma história começando pelo detalhe mais banal dela.",
    "Conte uma história cujo personagem principal não é você.",
    "Faça o leitor chegar à mesma conclusão que você apenas pelo que aconteceu na narrativa."
  ],
  "Livre": [...ORIGINAL_PROMPTS["Livre"]]
};
Object.entries(EXPANDED_PROMPTS).forEach(([category,prompts])=>PROMPTS[category]=prompts);
CATEGORY_SKILLS["Elaboração e storytelling"] = "Treinar desenvolvimento de ideias, construção de cenas, progressão narrativa e capacidade de conduzir o leitor até uma conclusão.";

choosePrompt=function(){
  const pool=selectedCategories.size?[...selectedCategories]:Object.keys(PROMPTS),recent=getRecent();
  const eligibleCategories=pool.filter(c=>(PROMPTS[c]||[]).length);
  const category=randomItem(eligibleCategories.length?eligibleCategories:pool);
  let candidates=(PROMPTS[category]||[]).filter(p=>!recent.includes(`${category}::${p}`));
  if(!candidates.length)candidates=[...(PROMPTS[category]||[])];
  if(!candidates.length)candidates=[...(PROMPTS[category]||[])];
  const prompt=randomItem(candidates);
  currentPrompt={category,prompt};
  recent.push(`${category}::${prompt}`);setRecent(recent);return currentPrompt;
};

// Categories and the expanded prompt library remain available without challenge filters.
populateCategories();
