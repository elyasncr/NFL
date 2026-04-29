"""
Base de Conhecimento da NFL
============================
Documentos usados para o RAG (Retrieval-Augmented Generation).
Cada entrada é um chunk de conhecimento que será indexado no ChromaDB.
"""

NFL_DOCUMENTS = [
    # ─────────────────────────────────────────
    # REGRAS BÁSICAS
    # ─────────────────────────────────────────
    {
        "id": "rules_basic_01",
        "category": "Regras",
        "title": "Estrutura do Jogo",
        "content": """
O futebol americano é jogado entre dois times de 11 jogadores cada.
O jogo tem 4 quartos de 15 minutos cada. O campo tem 100 jardas de comprimento
mais duas zonas de end zone de 10 jardas em cada extremidade.

O objetivo é marcar mais pontos que o adversário através de:
- Touchdown (TD): 6 pontos — carregar ou receber a bola na end zone adversária
- Extra Point (PAT): 1 ponto — chute após TD
- Two-Point Conversion: 2 pontos — jogar da end zone após TD
- Field Goal (FG): 3 pontos — chute entre as traves
- Safety: 2 pontos para a defesa — tackle do QB na própria end zone

O time com a posse tem 4 tentativas (downs) para avançar 10 jardas.
Se conseguir, recebe novas 4 tentativas. Se não, cede a posse.
""",
    },
    {
        "id": "rules_downs",
        "category": "Regras",
        "title": "Sistema de Downs",
        "content": """
O sistema de downs é o coração do futebol americano:

1st Down (Primeira Descida): Time começa com 10 jardas para percorrer.
2nd Down (Segunda Descida): Tentativa restante após ganho parcial.
3rd Down (Terceira Descida): A mais crítica — conversão mantém o drive vivo.
4th Down (Quarta Descida): Decisão estratégica — chutar (punt/FG) ou tentar converter.

Estatística importante: times convertem 3rd down em média 40% das vezes na NFL.
A taxa de conversão em 3rd down está fortemente correlacionada com o Success Rate ofensivo.
Times de elite convertem 3rd e curta (1-3 jardas) em mais de 75% das tentativas.
""",
    },
    {
        "id": "rules_penalties",
        "category": "Regras",
        "title": "Penalidades Mais Comuns",
        "content": """
Penalidades mais impactantes em termos de EPA:

OFENSIVAS:
- Holding (Segurada): -10 jardas. Ocorre ~5x por jogo. Alto impacto negativo no EPA.
- False Start: -5 jardas. Erro antes do snap. Elimina o EPA potencial da jogada.
- Offensive Pass Interference: -10 jardas. Raro mas devastador.

DEFENSIVAS:
- Pass Interference (PI): Bola vai ao local da falta. Pode valer 40+ jardas. Maior ganho de EPA possível.
- Defensive Holding: +5 jardas e 1st down automático. Presente em ~3 jogos por time/semana.
- Roughing the Passer: +15 jardas e 1st down. Proteção ao QB aumentou nas últimas décadas.
- Offside: -5 jardas. Comum em situações de blitz. Dá ao ataque um "free play".

A defesa penalizada numa situação de 3rd & longa é especialmente custosa em EPA.
""",
    },
    {
        "id": "rules_scoring",
        "category": "Regras",
        "title": "Pontuação e Situações Especiais",
        "content": """
Decisões estratégicas de pontuação que afetam o EPA:

FOURTH DOWN DECISIONS:
- Punt: Cede posse mas melhora posição de campo. Estratégico quando dentro do próprio território.
- Field Goal Attempt: Rentável entre 40-55 jardas. Além de 55 jardas: risco alto.
- Go for it (4th down): Estatisticamente favorável em muitas situações que os times não tentam.
  Modelos mostram que times deveriam tentar converter na 4ª descida com mais frequência.

TWO-POINT CONVERSION:
- Taxa de sucesso na NFL: ~50%
- Matematicamente equivalente ao chute do PAT (1 ponto × ~100%)
- Estratégico para alcançar o adversário em múltiplos de 2 ou 8 pontos.

ONSIDE KICK:
- Taxa de sucesso pré-2018: ~20%. Pós-2018 (nova regra): ~6%.
- Alternativa: onside kick surprise (diferente de onside kick óbvio).
""",
    },

    # ─────────────────────────────────────────
    # ANALYTICS AVANÇADO
    # ─────────────────────────────────────────
    {
        "id": "analytics_epa",
        "category": "Analytics",
        "title": "EPA — Expected Points Added",
        "content": """
EPA (Expected Points Added) é a métrica mais importante do football analytics moderno.

CONCEITO:
Antes de cada jogada, o modelo calcula os pontos esperados baseando-se em:
- Down (1ª, 2ª, 3ª, 4ª descida)
- Distância para o primeiro down (yards to go)
- Posição no campo (field position)

O EPA da jogada = Pontos Esperados Depois − Pontos Esperados Antes.

EXEMPLOS PRÁTICOS:
- Corrida de 8 jardas numa 1ª & 10 no próprio território: EPA ≈ +0.8 (ótimo)
- Corrida de 8 jardas numa 3ª & 12: EPA ≈ -0.3 (não converteu, perde posse)
- Interception numa 3ª & 20 no campo adversário: EPA ≈ -3.5 (catastrófico)
- TD de 70 jardas: EPA ≈ +6.5

INTERPRETAÇÃO DE MÉDIAS:
- EPA/play > +0.15: Time/QB de elite
- EPA/play 0 a 0.15: Acima da média
- EPA/play -0.05 a 0: Abaixo da média
- EPA/play < -0.05: Performance problemática (berlinda)

LIMITAÇÃO: EPA não ajusta pela qualidade da defesa adversária. DVOA faz isso.
""",
    },
    {
        "id": "analytics_cpoe",
        "category": "Analytics",
        "title": "CPOE — Completion Percentage Over Expected",
        "content": """
CPOE (Completion Percentage Over Expected) é a métrica mais honesta para avaliar QBs.

CONCEITO:
Para cada tentativa de passe, um modelo estima a probabilidade de completar aquele passe específico,
considerando: distância do passe (air yards), localização no campo, cobertura (se disponível),
pressão do pass rush, e tempo de decisão.

CPOE = Completion% Real − Completion% Esperada pelo Modelo

INTERPRETAÇÃO:
- CPOE > +3%: QB elite (Patrick Mahomes, Josh Allen em boa forma)
- CPOE 0 a +3%: QB acima da média
- CPOE -3% a 0: QB mediano
- CPOE < -3%: QB problemático (Berlinda territory)

POR QUE É MELHOR QUE COMPLETION%?
Um QB que joga em sistema de passes curtos (Andy Reid) terá completion% alto naturalmente.
CPOE remove esse viés e mede apenas a contribuição do QB.

Drake Maye (NE) em 2025: CPOE negativo consistente = sinal de dificuldades de adaptação.
Patrick Mahomes: CPOE historicamente entre +4% e +8%.
""",
    },
    {
        "id": "analytics_success_rate",
        "category": "Analytics",
        "title": "Success Rate e Air Yards",
        "content": """
SUCCESS RATE:
Uma jogada é considerada "sucesso" se:
- 1ª descida: ganha >= 40% das jardas necessárias
- 2ª descida: ganha >= 60% das jardas necessárias
- 3ª ou 4ª descida: converte o primeiro down (100%)

Times com Success Rate ofensivo > 50% são genericamente elites.
Defesas com Success Rate concedido < 40% são de nível playoff.

Success Rate elimina o efeito do garbage time (passes longos irrelevantes
quando um time está perdendo por muito e a defesa afunda).

AIR YARDS:
Jardas percorridas pela bola no ar antes de ser pega (ou cair incompleto).
- Deep passing: air yards > 20 (alto risco, alto retorno)
- Intermediate: air yards 10-20
- Short: air yards < 10 (sistema de passes curtos)

Médias da liga: ~8 air yards por tentativa. QBs agressivos jogam com 11-14.
""",
    },
    {
        "id": "analytics_turnover_points",
        "category": "Analytics",
        "title": "Pontos de Turnover e Posição de Campo",
        "content": """
TURNOVERS E IMPACTO EM PONTOS:

Um turnover tem impacto DUPLO:
1. Remove a posse do ataque (EPA negativo para o time que comete)
2. Dá ao adversário uma posição favorável no campo

PONTOS ESPERADOS POR POSIÇÃO:
- Própria end zone (0 yardas): ~-0.5 pontos esperados
- Própria 20 jardas: ~0.4 pontos esperados
- Meio de campo (50 jardas): ~2.0 pontos esperados
- Campo adversário (Red Zone, 20 jardas): ~3.8 pontos esperados
- Adversário 5 jardas: ~5.5 pontos esperados

Uma interception na 50 jardas do adversário vira ~5.5 pontos para o outro lado:
3.5 de EPA perdido + ~2.0 de posição de campo entregue.

TIMES COM MELHOR TURNOVER DIFFERENTIAL (histórico recente):
Turnover differential positivo é um dos maiores preditores de vitória na temporada.
""",
    },

    # ─────────────────────────────────────────
    # FORMAÇÕES E ESTRATÉGIAS
    # ─────────────────────────────────────────
    {
        "id": "formations_offense",
        "category": "Táticas",
        "title": "Formações Ofensivas",
        "content": """
FORMAÇÕES OFENSIVAS PRINCIPAIS:

SHOTGUN:
QB recebe o snap de 5-7 jardas atrás da linha de scrimmage.
Vantagem: mais tempo para ler a defesa e lançar.
Desvantagem: mais fácil para a defesa antecipar o passe.
Uso: ~65% das jogadas na NFL moderna. Times como KC usam >75%.

PISTOL:
QB a ~4 jardas com RB diretamente atrás.
Híbrido: mantém o ground game mas com mais visibilidade do QB.
Popularizado por Colin Kaepernick e spread offense universitária.

UNDER CENTER (I-Formation, Singleback):
QB sob o centro. Favorece o jogo de corrida e play action.
Power running: fullback abre o caminho para o RB.
Em desuso na NFL moderna mas ainda usado em situações de short yardage.

EMPTY BACKFIELD:
Sem running back no backfield. Cinco recebedores no campo.
Máxima pressão na cobertura. Obriga a defesa a mostrar seu esquema.
Alto EPA potencial mas vulnerável ao blitz se a OL não sustentar.
""",
    },
    {
        "id": "formations_defense",
        "category": "Táticas",
        "title": "Esquemas Defensivos",
        "content": """
ESQUEMAS DEFENSIVOS:

4-3 (Quatro na linha, três linebackers):
Base histórica da NFL. Forte contra a corrida. Dois DE e dois DT.
Vulnerável a TEs e passes pelo meio do campo.

3-4 (Três na linha, quatro linebackers):
Mais versátil. Os OLBs podem blitzar ou cobrir.
Popular com times como Pittsburgh Steelers e New England Patriots (era Belichick).

NICKEL (5 defensive backs):
5 DBs em campo. Usado em ~40% das jogadas na NFL atual.
Padrão contra formações com 3+ recebedores.

DIME (6 defensive backs):
6 DBs. Situações óbvias de passe longo (3ª & 15+).

COBERTURAS:
- Cover 0: Man-to-man sem safety profundo. Blitz máximo.
- Cover 1: Man-to-man com um safety profundo livre.
- Cover 2: Dois safetys dividem as zonas profundas. Vulnerável pelo meio.
- Cover 3: Três zonas profundas (2 CB + 1 safety). Forte contra passes curtos.
- Cover 4 (Quarters): Quatro zonas profundas. Excelente contra deep ball.
- Cover 6: Cover 4 de um lado, Cover 2 do outro. Híbrido moderno.
""",
    },

    # ─────────────────────────────────────────
    # POSIÇÕES
    # ─────────────────────────────────────────
    {
        "id": "positions_offense",
        "category": "Posições",
        "title": "Posições Ofensivas",
        "content": """
POSIÇÕES DO ATAQUE:

QB (Quarterback):
Líder do ataque. Decide entre correr, passar ou entregar a bola.
Avaliado por: EPA/play, CPOE, Success Rate, touchdowns, interceptions.

RB (Running Back):
Carrega a bola em corridas. Também recebe passes do backfield.
Avaliado por: rushing yards after contact, EPA por corrida, targets recebidos.

WR (Wide Receiver):
Receptores externos. Correm rotas para receber passes.
Avaliado por: PVOE (yards over expected), EPA por target, separation.

TE (Tight End):
Híbrido: bloqueia e recebe. Posição mais versátil do futebol moderno.
TEs de elite (Travis Kelce, Sam LaPorta) criam mismatches impossíveis.

OL (Offensive Line): 5 jogadores — C, 2 G, 2 T.
Protege o QB e abre buracos para o RB.
Avaliado por: sacks permitidos, pressures, run blocking grade.
""",
    },
    {
        "id": "positions_defense",
        "category": "Posições",
        "title": "Posições Defensivas",
        "content": """
POSIÇÕES DA DEFESA:

DL (Defensive Line): DE e DT.
Pressiona o QB e estanca a corrida na linha.
Avaliado por: pressures, sacks, tackle for loss (TFL).

LB (Linebacker):
Cobre TEs, RBs e ajuda na corrida e no blitz.
Avaliado por: tackles, coverage snaps, blitz EPA.

CB (Cornerback):
Cobre os WRs. A posição mais isolada do futebol.
Avaliado por: passer rating quando alvejado, yards concedidos por cobertura.

S (Safety): FS (Free Safety) e SS (Strong Safety).
FS: último recurso na zona profunda.
SS: híbrido — cobre TEs e ajuda na corrida.
Avaliado por: zone coverage, run stops, targets concedidos.
""",
    },

    # ─────────────────────────────────────────
    # TIMES E CONTEXTO ATUAL
    # ─────────────────────────────────────────
    {
        "id": "teams_context_2025",
        "category": "Times",
        "title": "Contexto NFL 2025-2026",
        "content": """
CONTEXTO DA NFL TEMPORADA 2025-2026:

KANSAS CITY CHIEFS:
Dominantes com Patrick Mahomes. EPA ofensivo de elite.
Travis Kelce ainda impactante mesmo com declínio de uso.
Defesa sólida. Favoritos para retornar ao Super Bowl.

BUFFALO BILLS:
Josh Allen com CPOE alto e EPA ofensivo consistente.
Maior rival dos Chiefs no AFC. Stefon Diggs saiu mas o sistema permanece forte.

PHILADELPHIA EAGLES:
Saquon Barkley chegou como RB1. Jalen Hurts com EPA positivo.
Sistema ofensivo equilibrado de Nick Sirianni.

SAN FRANCISCO 49ERS:
Kyle Shanahan e o sistema de play action mais eficiente da liga.
Brock Purdy: CPOE surpreendentemente alto para um "Mr. Irrelevant".
Christian McCaffrey: RB mais valioso da liga em EPA.

NEW ENGLAND PATRIOTS:
Era pós-Belichick. Drake Maye como QB reconstrução.
Um dos piores elencos da liga. Berlinda estatística inevitável.

DETROIT LIONS:
Jared Goff com Success Rate alto. Dan Campbell e cultura agressiva.
4th down go-for-it rate mais alto da liga. Estatisticamente justificado.
""",
    },

    # ─────────────────────────────────────────
    # ML E CIÊNCIA DE DADOS APLICADOS
    # ─────────────────────────────────────────
    {
        "id": "ml_win_prediction",
        "category": "Machine Learning",
        "title": "Predição de Vitória com ML",
        "content": """
PREDIÇÃO DE VITÓRIA NA NFL:

FEATURES MAIS IMPORTANTES (baseado em feature importance do XGBoost):
1. EPA ofensivo da casa: quanto melhor o ataque em casa, maior prob. de vitória
2. EPA defensivo do visitante: defesa fraca = mais pontos concedidos
3. EPA ofensivo do visitante: visitantes fortes vencem fora
4. Success Rate ofensivo: consistência > jogadas grandes

BASELINE:
Times da casa vencem ~57% dos jogos na NFL historicamente.
O modelo deve superar esse baseline para ser útil.

LIMITAÇÕES DO MODELO:
- Usa stats acumuladas da temporada: não captura tendências recentes
- Não considera lesões (ausência do QB titular muda tudo)
- Não captura condições climáticas (vento forte reduz passes aéreos)
- Playoff football pode ter dinâmicas diferentes da temporada regular

MELHORIAS FUTURAS:
- Adicionar Elo rating para capturar momentum
- Integrar dados de lesões (injury reports)
- Treinar modelo separado para playoffs
- Feature de "forma recente" (últimas 4 semanas vs season-long)
""",
    },
    {
        "id": "ml_rag_agent",
        "category": "Machine Learning",
        "title": "RAG e Agentes de IA na NFL Analytics",
        "content": """
RAG (RETRIEVAL-AUGMENTED GENERATION) NA NFL:

O problema dos LLMs puros:
Modelos como Llama3 foram treinados até uma data de corte.
Estatísticas da temporada atual, lesões recentes e resultados novos
não estão no conhecimento base do modelo.

SOLUÇÃO — RAG:
1. Base de conhecimento local (regras, métricas, contexto histórico)
2. Dados em tempo real da API (EPA atual, resultados recentes)
3. Pergunta do usuário → busca semântica nos documentos → contexto relevante
4. LLM gera resposta com esse contexto específico

AGENTES DE IA:
Vão além do RAG. O agente pode:
- DECIDIR quais ferramentas usar (stats API, predição ML, busca RAG)
- ENCADEAR múltiplos passos de raciocínio
- ITERAR até ter informação suficiente para responder

Exemplo: "O KC vai ganhar no domingo?"
Agente: 1) busca stats atuais do KC e adversário → 2) roda predição ML →
3) busca contexto de lesões no RAG → 4) gera análise completa

VISÃO COMPUTACIONAL:
Análise de formações táticas: YOLOv8 pode detectar posições de jogadores
em imagens de transmissão e classificar automaticamente a formação.
""",
    },
]

# Cria texto plano para cada documento (para embedding)
def get_all_documents_text() -> list[dict]:
    """Retorna lista de dicts com id, content e metadata para indexação."""
    return [
        {
            "id": doc["id"],
            "content": f"{doc['title']}\n\n{doc['content'].strip()}",
            "metadata": {
                "category": doc["category"],
                "title": doc["title"],
                "id": doc["id"],
            }
        }
        for doc in NFL_DOCUMENTS
    ]
