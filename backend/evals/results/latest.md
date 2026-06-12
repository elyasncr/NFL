# Eval — 2026-06-12 22:54

| Camada | Métrica | Valor |
|---|---|---|
| Retrieval | hit@1 / hit@3 / MRR | 0.633 / 0.933 / 0.764 |
| RAG | fact coverage / judge (1-5) | 0.95 / 4.533 |
| Agente | tool accuracy / iterações médias | 0.917 / 2.0 |

## Piores itens
- `epa_vs_jardas` (retrieval): doc esperado fora do top-3 — veio ['rules_penalties', 'ml_win_prediction', 'analytics_turnover_points']
- `posicao_ol` (retrieval): doc esperado fora do top-3 — veio ['ml_win_prediction', 'rules_downs', 'positions_defense']
- `epa_vs_jardas` (rag): coverage 0.0, judge 5
- `pontuacao_2pt` (rag): coverage 0.5, judge 5
- `sb_lx_campeao` (rag): coverage 1.0, judge 2
- `multi_stats_matchup` (agent): esperado ['get_team_stats', 'predict_matchup'] → usado ['predict_matchup']
