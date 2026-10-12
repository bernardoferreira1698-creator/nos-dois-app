# Prompt para o Claude Code — App "Nós Dois"

Constrói uma web app (PWA) para um casal usar no iPhone, adicionada ao ecrã principal a partir do Safari, para que pareça e funcione como uma app nativa. Toda a interface em português de Portugal (PT-PT).

## Conceito

O ecrã principal mostra 5 categorias. Ao tocar numa, abre um ecrã que sorteia aleatoriamente uma opção dessa categoria e a mostra num cartão grande. Um botão "Dá-me outra" sorteia uma nova opção. Os dois membros do casal partilham um "grupo", para verem os resultados um do outro.

## Regras de conteúdo (respeitar em todas as ideias, incluindo as que acrescentares no futuro)

- Não bebemos vinho: nada de provas de vinho, bares de vinho ou atividades à volta de vinho ou champanhe.
- Não gostamos de aulas ou atividades de dança.
- Ainda não vivemos juntos: nada que dependa de partilhar casa (tarefas domésticas, arrumar a casa, fazer a cama, etc.).
- Nenhum de nós tem banheira.
- Não gostamos de demonstrações de afeto visíveis em público (por exemplo, andar de mãos dadas na rua). Provocações discretas, que só nós os dois percebemos, são ok: o que for só entre nós está tudo bem.
- Nada que obrigue a gastar muito dinheiro.
- Nada infantil.
- Atividades fáceis de fazer numa zona urbana (nada de cavalos, lagos, pesca, etc.).
- Nos vales, qualquer benefício do tipo "quando quiseres" ou "sempre que pedires" é válido durante 1 semana.

## Requisitos técnicos

- Frontend em HTML, CSS e JavaScript simples (sem frameworks e sem build), para ser fácil de manter.
- Backend gratuito e simples para guardar os dados partilhados do grupo e enviar notificações. Sugestão: Supabase (base de dados, autenticação, Edge Functions e agendamento com pg_cron). Se achares que há uma opção mais simples para um principiante, propõe-ma e explica porquê antes de avançar.
- Todas as ideias guardadas num ficheiro `data.js` (ou `data.json`) dentro do frontend, organizadas por categoria, para eu poder editar ou acrescentar ideias facilmente.
- PWA completa: `manifest.json`, ícone (gera um ícone simples e bonito, incluindo `apple-touch-icon` 180x180), `service worker` (cache offline e receção de notificações push), `<meta name="apple-mobile-web-app-capable" content="yes">` e meta tags para abrir em ecrã inteiro no iPhone.
- Respeitar as safe areas do iPhone (notch e barra inferior) com `env(safe-area-inset-*)`.
- Mobile-first, otimizada para iPhone; deve também funcionar num browser de computador.
- O sorteio deve funcionar offline; o que for partilhado sincroniza quando houver internet.

## Grupo do casal

1. **Entrar**: cada pessoa entra com o seu email (código ou link mágico, sem passwords) e escolhe o nome que aparece ao outro.
2. **Criar ou juntar-se a um grupo**: um cria o grupo e recebe um código de 6 caracteres; o outro introduz esse código para entrar. Um grupo tem no máximo 2 pessoas.
3. **Histórico partilhado** (Dates, Perguntas, Desafios e Spicy): sempre que alguém sorteia e toca em "Escolher esta", o resultado vai para o histórico do grupo, visível para os dois, com quem escolheu e a data. Cada resultado pode ser marcado como "Feito".
4. **Vales pessoais**: o vale pertence a quem o tirou. Fica na carteira dessa pessoa e o outro consegue vê-lo num separador "Vales de [nome]", para saber o que tem de cumprir. Para marcar um vale como "Usado" é preciso a aprovação do outro membro do grupo: quem o quer marcar toca em "Marcar como usado", o outro recebe uma notificação push e um pedido dentro da app para aprovar ou recusar, e só depois de aprovado o vale passa a "Usado" (com a data). Enquanto espera, o vale aparece como "A aguardar aprovação". Vales com validade mostram uma contagem decrescente de 1 semana a partir do momento em que são ativados e passam a "Expirado" quando o tempo acaba.
5. **Favoritos** partilhados pelo grupo.

## Notificação semanal surpresa

- Uma vez por semana, num dia e numa hora aleatórios (entre as 10h e as 21h, hora de Portugal), os dois recebem ao mesmo tempo uma notificação push a dizer que está na hora de escolher uma.
- Em cerca de metade das semanas, de forma aleatória, é a própria app que escolhe a categoria (por exemplo: "Esta semana a app escolheu por vocês: Desafios 🎯"). Nas outras, a mensagem convida-os a escolher.
- Ao tocar na notificação, a app abre diretamente na categoria escolhida e já com uma ideia sorteada (ou no ecrã principal, se a categoria não foi escolhida).
- A categoria Spicy só pode ser escolhida pela app se os dois a tiverem ativado nas definições.
- Usar Web Push com chaves VAPID. Nas definições, um botão "Ativar notificações" pede a permissão (no iPhone, isto só funciona com a app adicionada ao ecrã principal, por isso mostra uma explicação se não estiver).
- Opção nas definições para desligar as notificações.

## Funcionalidades gerais

1. **Ecrã principal** com as 5 categorias em cartões grandes, cada uma com emoji, nome e uma frase curta, e acesso a Histórico, Carteira de vales, Favoritos e Definições.
2. **Sorteio sem repetições**: dentro de cada categoria, não repetir uma opção até todas terem saído (baralhar a lista e percorrê-la; quando acabar, baralhar de novo). O progresso é partilhado pelo grupo.
3. **Animação** suave ao sortear (o cartão vira ou baralha), com vibração leve se o dispositivo suportar.
4. **Categoria Spicy protegida**: aparece com um cadeado. Ao tocar, pede confirmação ("Conteúdo +18 — continuar?") e, opcionalmente, um PIN de 4 dígitos definido nas definições (o PIN fica só no telemóvel de cada um).
5. **Definições**: nome, código do grupo, sair do grupo, PIN do Spicy, ativar ou desativar o Spicy nas notificações, notificações, repor o progresso dos sorteios.
6. **Botão voltar** sempre visível no ecrã de categoria.

## Design

Romântico mas moderno e elegante — nada de corações a mais nem visual infantil. Cada categoria tem a sua cor de destaque. Tipografia com personalidade (pode usar Google Fonts com fallback). Suporte a modo claro e escuro automático. Botões grandes, fáceis de tocar com o polegar.

Cores sugeridas por categoria: Dates (coral), Perguntas (azul suave), Vales (dourado), Desafios (verde), Spicy (vermelho/bordô).

## Como trabalhar comigo

Sou principiante e não sei programar. Explica cada passo em linguagem simples e diz-me exatamente onde clicar quando eu tiver de fazer algo fora daqui (criar contas, copiar chaves, etc.). Antes de escolheres serviços, confirma que o plano gratuito chega para isto e avisa-me de limitações importantes (por exemplo, se o projeto é pausado por inatividade).

## Depois de construir

1. Testa localmente e mostra-me como abrir no browser do computador.
2. Ajuda-me a configurar o backend e a publicar o frontend online gratuitamente (por exemplo Netlify ou GitHub Pages), passo a passo.
3. Testa a notificação enviando uma de teste aos dois telemóveis.
4. Dá-me o link final e explica como adicionar ao ecrã principal do iPhone, ativar as notificações e criar o grupo.

---

## Conteúdo das categorias

### 🍷 Dates — "Ideias para o próximo encontro"

1. Jantar num restaurante italiano e partilhar uma sobremesa
2. Piquenique num jardim com comida que nenhum dos dois provou antes
3. Ir a um jardim e desenharem-se um ao outro
4. Ver o pôr do sol num miradouro com um lanche levado de casa
5. Cozinhar juntos um prato de um país que nunca visitaram
6. Noite de cinema em casa com mantas e pipocas feitas por vocês
7. Fazer uma aula experimental de surf juntos
8. Fazer uma aula de cerâmica juntos
9. Passear numa feira da ladra ou mercado de antiguidades e comprar um objeto um para o outro com 5€
10. Jantar à luz das velas em casa, com dress code
11. Ir ao teatro ver uma peça escolhida às cegas
12. Fazer um passeio de bicicleta ao longo do rio
13. Visitar um museu e escolher cada um a sua obra preferida e explicar porquê
14. Noite de jogos de tabuleiro com apostas românticas
15. Tomar o pequeno-almoço fora num sítio novo
16. Fazer uma caminhada num trilho na natureza
17. Ir a um concerto de uma banda que um dos dois não conhece
18. Ir a um bar de jogos ou arcade retro
19. Noite de karaoke a dois
20. Fazer uma escapadinha de um dia a uma vila que não conhecem
21. Ir à praia ao fim do dia, fora de época
22. Fazer um jantar temático com decoração e música a condizer
23. Ir ao cinema ver o primeiro filme que estiver a começar
24. Fazer sushi em casa
25. Ver as estrelas longe da cidade
26. Ir a um spa ou fazer um dia de spa em casa
27. Visitar um jardim botânico
28. Fazer um passeio de barco
29. Noite de mocktails: cada um inventa uma bebida sem álcool para o outro
30. Recriar o vosso primeiro encontro
31. Ir a um bar com música ao vivo
32. Fazer um workshop de cozinha
33. Tour de pastelarias: provar o pastel de nata em três sítios e eleger o melhor
34. Fazer um puzzle de 1000 peças com música e snacks
35. Dormir uma noite num alojamento diferente (cabana, glamping, casa na árvore)
36. Passeio de kayak ou paddle
37. Ir a um mercado e cozinhar com o que comprarem lá
38. Noite de fondue
39. Ir a uma exposição de fotografia e depois fazerem uma sessão fotográfica um ao outro
40. Fazer uma noite de "primeiros encontros": fingir que se estão a conhecer
41. Escrever cartas um ao outro num café e trocá-las no fim
42. Passeio de tuk-tuk ou elétrico como turistas na vossa cidade
43. Noite de jogos de vídeo cooperativos
44. Fazer uma maratona da vossa série preferida com snacks temáticos
45. Ir a um festival de comida de rua
46. Fazer uma aula de pintura ou aguarela
47. Jantar num restaurante de uma cozinha que nunca experimentaram
48. Ir a uma escape room
49. Sessão de massagens com óleos e música relaxante
50. Ver o nascer do sol juntos
51. Plantar algo juntos (uma planta, ervas aromáticas)
52. Ir a um parque de diversões ou feira popular
53. Fazer um brunch em casa com tudo a que têm direito
54. Ir jogar bowling ou snooker
55. Noite de stand-up comedy
56. Fazer uma "date sem telemóveis" durante uma tarde inteira
57. Escolher um destino ao acaso no mapa a menos de uma hora e ir lá
58. Ir a uma livraria e cada um escolher um livro para o outro
59. Fazer pizza caseira com massa feita por vocês
60. Ir a um rooftop ao fim da tarde
61. Ir a um jantar às escuras
62. Fazer um piquenique noturno com lanternas
63. Ir patinar
64. Fazer uma tarde de compras com orçamento: escolher um look para o outro
65. Noite de documentários com debate no fim
66. Visitar um castelo ou monumento histórico
67. Ir a uma termas
68. Fazer uma aula de yoga a dois
69. Fazer um roteiro de street art na cidade
70. Noite de tapas com vários pratinhos feitos em casa
71. Ir a um minigolfe
72. Fazer uma noite de spa com máscaras faciais
73. Ir andar de karts
74. Fazer uma tour de cafés de especialidade e eleger o favorito
75. Assistir a um jogo ao vivo de um desporto
76. Ir a uma sessão de cinema ao ar livre ou num cinema antigo
77. Fazer um jantar só com sobremesas
78. Ir a um mercado de Natal ou feira sazonal
79. Escrever juntos uma bucket list do casal num café
80. Fazer uma noite de "sim": um dos dois tem de dizer sim a todas as propostas (razoáveis) do outro

### 💬 Perguntas — "Para se conhecerem ainda melhor"

1. Qual foi o momento em que percebeste que gostavas de mim?
2. O que é que te fez sorrir esta semana?
3. Qual é a tua memória preferida de nós os dois?
4. Se pudéssemos viver em qualquer país durante um ano, qual seria?
5. O que é que eu faço que te faz sentir amado?
6. Qual é o teu maior sonho que ainda não me contaste?
7. Como imaginas a nossa vida daqui a 10 anos?
8. Qual foi a primeira coisa que reparaste em mim?
9. O que é que tens mais orgulho em ti?
10. Que hábito meu achas mais adorável?
11. Qual foi o dia mais feliz da tua vida até hoje?
12. Se tivesses de descrever a nossa relação numa palavra, qual seria?
13. O que é que gostavas que fizéssemos mais vezes?
14. Qual é o teu medo mais irracional?
15. Que música te faz lembrar de mim?
16. O que é que aprendeste comigo?
17. Qual foi a coisa mais corajosa que já fizeste?
18. Se ganhássemos o Euromilhões amanhã, qual seria a primeira coisa que fazíamos?
19. Que tradição gostavas que criássemos juntos?
20. O que é que te deixa mais em paz?
21. Qual é o teu filme de conforto e porquê?
22. Há alguma coisa que gostavas que eu soubesse e nunca disseste?
23. Como era o teu "eu" de 15 anos?
24. Qual é a tua linguagem do amor preferida?
25. O que é que te deixa nervoso numa relação?
26. Qual foi a viagem que mais te marcou?
27. Que pessoa da tua vida mais te influenciou?
28. O que é para ti um domingo perfeito?
29. Que conselho darias ao teu "eu" de há 5 anos?
30. Do que é que tens mais saudades da infância?
31. O que é que te faz sentir mais confiante?
32. Qual é a tua comida de conforto?
33. Se pudesses mudar uma coisa no mundo, o que seria?
34. Qual foi a maior lição que uma relação passada te ensinou?
35. Qual é a qualidade que mais admiras em mim?
36. O que é que te tira do sério sem razão nenhuma?
37. Qual é o teu objetivo para este ano?
38. Em que momento te sentiste mais perto de mim?
39. Que hobby gostavas de experimentar?
40. Qual seria o teu dia perfeito comigo, do início ao fim?
41. O que é que significa "casa" para ti?
42. Que parte da tua personalidade achas que as pessoas não veem?
43. Qual foi a última vez que choraste a rir?
44. Se fosses um animal, qual serias?
45. Que superpoder escolherias?
46. O que te faz sentir respeitado?
47. Que livro ou filme te mudou?
48. Qual é a tua maior insegurança?
49. Como gostas de ser consolado quando estás em baixo?
50. Qual é o teu maior arrependimento?
51. O que é que mais te diverte em mim?
52. Achas que somos parecidos ou diferentes? Em quê?
53. Qual foi a melhor prenda que já recebeste?
54. Que valor nunca abdicarias numa relação?
55. Se pudesses jantar com qualquer pessoa, viva ou morta, quem seria?
56. Que coisa pequena eu faço que te faz o dia?
57. Qual é a tua estação do ano preferida e porquê?
58. Como lidas com o stress?
59. O que é que gostavas que melhorássemos enquanto casal?
60. Que momento nosso gostavas de reviver?
61. Qual é a tua maior paixão?
62. O que é que nunca farias, nem por todo o dinheiro do mundo?
63. Que tipo de velhinhos achas que vamos ser?
64. Qual foi o maior desafio que superaste?
65. Que memória de família guardas com carinho?
66. Preferes planear tudo ou deixar acontecer?
67. O que é que te inspira?
68. Qual é o teu pior hábito?
69. Se escrevesses um livro sobre nós, como se chamaria?
70. O que é que te deixa orgulhoso de nós?
71. Qual é a tua ideia de romance?
72. Que trabalho farias se o dinheiro não importasse?
73. O que te faz sentir mais vivo?
74. Qual é a coisa mais estranha de que gostas?
75. Que discussão nossa achas que nos fez crescer?
76. O que é que precisas mais de mim neste momento?
77. Qual é o teu cheiro preferido?
78. Se pudesses voltar a um dia da tua vida, qual seria?
79. Que promessa me queres fazer hoje?
80. O que é que te faz ter a certeza de que somos uma boa equipa?

### 🎟️ Vales — "Um vale para trocar entre vocês"

1. Vale uma massagem de 20 minutos
2. Vale pequeno-almoço na cama
3. Vale ficar com a razão, mesmo quando não a tens
4. Vale interromper uma discussão com um abraço
5. Vale escolher o filme sem discussão
6. Vale escolher o plano do próximo fim de semana
7. Vale escolher o restaurante do próximo jantar
8. Vale um jantar cozinhado pelo outro
9. Vale uma sesta sem interrupções
10. Vale pedir desculpa sem ter de explicar
11. Vale um pedido de "sim" sem perguntas (razoável!)
12. Vale massagem aos pés
13. Vale ser o DJ na próxima viagem de carro
14. Vale uma noite de mimo total
15. Vale um elogio sincero sempre que pedires, durante 1 semana
16. Vale ficar com o último pedaço
17. Vale uma noite de filme por videochamada, cada um em sua casa
18. Vale uma tarde sozinho, sem culpa
19. Vale ser levado a passear onde quiseres
20. Vale beijos quando quiseres (em privado), durante 1 semana
21. Vale uma carta escrita à mão
22. Vale uma surpresa entregue à tua porta
23. Vale escolher a próxima série
24. Vale abraços de 1 minuto sempre que pedires, durante 1 semana
25. Vale cancelar um plano social sem drama
26. Vale ganhar uma discussão sobre onde ir comer
27. Vale um cafuné durante um episódio inteiro
28. Vale um date surpresa planeado pelo outro
29. Vale comprar um mimo até 10€
30. Vale um pedido de música dedicada
31. Vale ficar na cama mais 30 minutos
32. Vale tratar de um recado teu
33. Vale um passeio a pé à tua escolha
34. Vale perdão imediato por um esquecimento
35. Vale ouvir-te desabafar sem dar conselhos
36. Vale uma sobremesa à tua escolha
37. Vale ficar com o melhor lado do sofá
38. Vale uma sessão fotográfica tua
39. Vale uma playlist feita só para ti
40. Vale não falar de trabalho durante uma noite
41. Vale um jogo à tua escolha
42. Vale ir buscar-te onde estiveres, durante 1 semana
43. Vale uma mensagem de bom dia carinhosa durante uma semana
44. Vale um "vai correr tudo bem" acompanhado de chá
45. Vale escolher o destino da próxima escapadinha
46. Vale uma noite de cozinha à tua escolha
47. Vale um momento de mimo no sofá sem telemóveis
48. Vale escolher o próximo take-away
49. Vale o último episódio, mesmo que o outro tenha sono
50. Vale ter a última palavra numa decisão pequena
51. Vale gelados pagos pelo outro, durante 1 semana
52. Vale ser o outro a deslocar-se até tua casa
53. Vale tratar do jantar quando estás cansado
54. Vale um lanche surpresa preparado pelo outro
55. Vale uma manhã de domingo à tua maneira
56. Vale anular uma birra
57. Vale um pedido especial na cama
58. Vale ser acompanhado a um evento chato sem queixas
59. Vale escolher em casa de quem passam a noite
60. Vale uma ida ao cinema com filme e snacks à tua escolha
61. Vale escolher a roupa do outro para um jantar
62. Vale um dia de "tudo o que quiseres" (dentro do razoável)
63. Vale um mimo surpresa ao longo da semana
64. Vale um "tens razão" dito com convicção
65. Vale uma tarde de jogos à tua escolha
66. Vale ajuda a preparar um momento importante (entrevista, apresentação, exame)
67. Vale um reset: recomeçar o dia do zero depois de uma discussão
68. Vale não ter de responder "tanto faz" a nada
69. Vale uma noite de cinema completamente à tua escolha
70. Vale ir contigo ao médico, dentista ou a um compromisso chato
71. Vale um pequeno-almoço especial ao domingo
72. Vale um dia sem críticas
73. Vale escolher a música no ginásio ou na corrida juntos
74. Vale um beijo de bom dia demorado
75. Vale tratar de uma tarefa que andas a adiar
76. Vale ficar com o comando a noite toda
77. Vale um elogio público nas redes sociais
78. Vale um jantar fora pago pelo outro
79. Vale uma escapadinha de fim de semana planeada pelo outro
80. Vale um desejo à tua escolha

### 🎯 Desafios — "Para fazerem juntos"

1. Cozinhar um prato só com 5 ingredientes
2. Ficar 24 horas sem telemóveis um com o outro
3. Escrever um poema um ao outro em 10 minutos
4. Desenhar o retrato do outro com a mão não dominante
5. Fazer um treino juntos em que cada um escolhe os exercícios do outro
6. Fazer um vídeo a recriar a vossa cena preferida de um filme
7. Correr ou caminhar 5 km juntos
8. Fazer 30 minutos de exercício juntos todos os dias durante uma semana
9. Dizer três coisas que admiram um no outro sem rir
10. Aprender 10 palavras numa língua nova
11. Fazer uma refeição completa só com o que há no frigorífico
12. Ficar um minuto a olharem-se nos olhos em silêncio
13. Criar uma playlist a quatro mãos com 20 músicas
14. Fazer um jantar só com comida de uma cor
15. Fazer um bolo sem receita
16. Planear uma viagem completa (destino, orçamento e roteiro) em 1 hora
17. Escrever juntos a vossa história em 10 frases
18. Imitar-se um ao outro durante 5 minutos
19. Fazer uma sessão de fotos com temas aleatórios
20. Ver um filme escolhido pelo outro sem saber nada sobre ele
21. Aprender um truque de magia e mostrá-lo ao outro
22. Fazer uma prova cega de chocolates
23. Fazer uma lista de 20 coisas que querem fazer juntos este ano
24. Responder a 10 perguntas sobre o outro e ver quem sabe mais
25. Fazer uma caça ao tesouro em casa um para o outro
26. Cozinhar o prato preferido de infância do outro
27. Fazer uma prancha juntos e ver quem aguenta mais
28. Contar a história de como se conheceram, cada um na sua versão
29. Passar uma noite só à luz de velas
30. Escrever uma carta para abrirem daqui a um ano
31. Fazer origami juntos
32. Gravar juntos um vídeo com uma trend que não seja de dança
33. Fazer um quiz de cultura geral um contra o outro
34. Fazer uma noite de mímica
35. Cada um planear 1 hora do dia do outro
36. Fazer uma refeição sem talheres
37. Aprender juntos uma música (cantar ou tocar)
38. Escrever 5 coisas que querem melhorar enquanto casal
39. Fazer um "dia do sim" um ao outro
40. Montar um álbum de fotos do último ano
41. Fazer 50 abdominais cada um, a contar juntos
42. Fazer um jantar com os olhos vendados (o outro dá de comer)
43. Criar um ritual semanal só vosso
44. Aprender a fazer um matcha ou um café de especialidade perfeito
45. Fazer uma noite de trivia sobre a vossa relação
46. Passar um dia inteiro a falar com sotaque
47. Fazer um mural de objetivos para o próximo ano
48. Plantar uma planta e mantê-la viva durante um mês
49. Fazer uma sessão de meditação a dois
50. Recriar uma foto antiga vossa
51. Fazer um jogo de "verdade ou consequência" leve
52. Fazer uma noite sem televisão, só conversa
53. Desenhar a casa dos vossos sonhos
54. Cozinhar uma refeição completa em menos de 20 minutos
55. Fazer uma lista de 10 coisas que gostam no corpo do outro
56. Escrever uma música curta sobre a relação
57. Aprender a fazer massa fresca
58. Ler o mesmo livro e discutirem-no no fim
59. Fazer uma pizza em que cada um escolhe os ingredientes de metade
60. Fazer um passeio sem destino, só a virar à esquerda e à direita alternadamente
61. Fazer um puzzle em menos de uma hora
62. Fazer uma noite temática de outro país (comida, música, filme)
63. Passar um dia a fazer só elogios um ao outro
64. Inventar uma receita nova e dar-lhe um nome
65. Fazer um desafio de 7 dias sem açúcar
66. Ensinar algo que sabem fazer ao outro
67. Fazer um diário de casal durante uma semana
68. Fazer um vídeo de "um dia na nossa vida"
69. Fazer yoga a pares
70. Contar 3 segredos inofensivos que o outro não sabe
71. Fazer uma prova de gelados de olhos fechados
72. Preparar um pequeno-almoço surpresa um para o outro no mesmo dia
73. Fazer um quiz de música: adivinhar a música em 5 segundos
74. Desenhar uma tatuagem imaginária um para o outro
75. Fazer um voluntariado juntos
76. Fazer uma sessão de stretching de 15 minutos
77. Escrever uma lista de "coisas que nunca te disse"
78. Organizar fotos do telemóvel e escolher as 10 melhores do ano
79. Fazer um "date" de 10€ de orçamento total
80. Dizer "amo-te" de 10 formas diferentes ao longo do dia

### 🔥 Spicy — "Só para os dois" (+18)

1. Massagem sensual com óleo, de 15 minutos para cada um
2. Escolher uma fantasia e contá-la ao ouvido do outro
3. Beijar-se durante dois minutos sem usar as mãos
4. Venda nos olhos (serve uma máscara de dormir ou uma t-shirt): um guia, o outro só sente
5. Despir o outro devagar, peça a peça
6. Mensagem de voz atrevida enviada durante o dia
7. Enviar uma mensagem atrevida ao outro durante o dia
8. Strip-tease de uma música
9. Dizer três coisas que adoras que o outro te faça
10. Jogo dos dados: um diz a zona, o outro escolhe a ação
11. Dez minutos só de beijos no pescoço
12. Trocar de papéis: quem costuma liderar, hoje segue
13. Ficar na cama a manhã toda sem pressa
14. Usar um cubo de gelo para explorar o corpo do outro
15. Um encontro "a fingir que são estranhos" num bar
16. Escolher juntos uma peça de lingerie ou roupa interior nova
17. Massagem só com as pontas dos dedos
18. Fazer amor num sítio da casa diferente do habitual
19. Um diz o que quer, o outro só pode responder "sim"
20. Ler juntos uma história erótica em voz alta
21. Jogo de "quente ou frio" com o corpo do outro
22. Ficar 10 minutos só com carícias, sem mais nada
23. Mensagem com uma foto sugestiva (só entre vocês)
24. Cada um escreve um desejo num papel e trocam
25. Escolher juntos a próxima coisa nova a experimentar e marcar o dia
26. Ditar ao ouvido o que vais fazer, antes de o fazer
27. Massagem nos pés que vai subindo
28. Jogo de verdade ou consequência na versão picante
29. Fazer uma noite com música sensual escolhida a dois
30. Um fica imóvel e o outro faz o que quiser durante 5 minutos
31. Experimentar uma posição nova
32. Provocar o outro durante o jantar, por debaixo da mesa
33. Fazer uma lista do "nunca experimentámos mas talvez"
34. Usar chocolate ou chantilly
35. Contar o momento mais quente que já viveram juntos
36. Beijar o corpo todo do outro, da cabeça aos pés
37. Duche a dois com massagem de champô
38. Recriar a vossa primeira noite
39. Noite de "só o que o outro pedir"
40. Ditar regras: proibido usar as mãos durante 5 minutos
41. Ficar abraçados de luzes apagadas a dizer o que querem um do outro
42. Escolher uma palavra de código para "quero-te agora"
43. Usar uma peça de roupa do outro e mais nada
44. Provocar com sussurros num sítio público, com discrição
45. Massagem com uma pena
46. Elogiar cada parte do corpo do outro
47. Jogo de cartas: quem perde a ronda tira uma peça
48. Acordar o outro com beijos
49. Experimentar um brinquedo novo juntos
50. Uma hora sem telemóveis, só para os dois na cama
51. Descrever em detalhe o que mais te atrai no outro
52. Encontro em casa com dress code sensual
53. Usar algemas de peluche ou fita de cetim
54. Um guia as mãos do outro pelo próprio corpo
55. Jogo dos sentidos: provar, cheirar, tocar de olhos vendados
56. Fazer amor só à luz de uma vela
57. Escrever no corpo do outro com o dedo e ele adivinha
58. Cada um escolhe a playlist da noite
59. Mensagens atrevidas durante um jantar com amigos
60. Massagem nas costas que termina como o outro quiser
61. Contar uma fantasia que ainda não partilharam
62. Fazer uma noite "devagar": tudo ao dobro do tempo
63. Tirar uma peça de roupa por cada pergunta respondida
64. Escolher juntos um cenário de roleplay
65. Beijos só nos sítios que o outro indicar
66. Usar óleo aquecido para uma massagem completa
67. Fazer amor de manhã antes de qualquer coisa
68. Um dita as regras do jogo durante toda a noite
69. Provocar ao máximo sem chegar a vias de facto durante um dia
70. Sessão de beijos no carro como adolescentes
71. Experimentar um sítio fora do quarto
72. Dizer ao ouvido do outro o que ele te faz sentir
73. Um descreve em voz alta, o outro faz exatamente o que ouviu
74. Jogo do espelho: imitar todos os movimentos do outro
75. Partilhar o "top 3" de memórias picantes vossas
76. Montar um "menu" de três momentos para a noite: entrada, prato e sobremesa
77. Escolher um ritmo e não o mudar até o outro pedir
78. Escrever uma carta erótica para o outro ler sozinho
79. Fazer uma noite de hotel em casa: lençóis lavados, velas e serviço de quarto
80. Desejo livre: o outro escolhe e tu aceitas (sempre com consentimento)
