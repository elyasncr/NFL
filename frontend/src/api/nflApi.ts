import axios from 'axios'

// Dentro do Docker: Vite proxy redireciona /ml, /rag, /agent, /vision para o backend
// Fora do Docker: usa localhost:8000 diretamente
const BASE_URL = typeof window !== 'undefined' && window.location.port === '5173'
  ? ''                         // Dev (Vite proxy cuida do redirecionamento)
  : 'http://localhost:8000'   // Fallback direto

const api = axios.create({ baseURL: BASE_URL, timeout: 120000 })

export interface TeamStats { team: string; off_epa: number; def_epa: number; off_pass_epa: number; off_rush_epa: number; def_pass_epa: number; def_rush_epa: number; off_success_rate: number; def_success_rate: number }
export interface MatchupResult { home_team: string; away_team: string; home_win_probability: number; away_win_probability: number; insight: string; home_stats: TeamStats; away_stats: TeamStats; radar: { labels: string[]; datasets: Array<{ label: string; data: number[] }> } }
export interface HotSeatResult { quarterback: string; team: string; games_analyzed: number; recent_epa: number; recent_cpoe: number; trend: string; is_critical: boolean; severity: 'CRÍTICO' | 'ALERTA' | 'ATENÇÃO' | 'SEGURO'; message: string; game_log: Array<{ game_id: string; epa_mean: number; plays: number }> }
export interface ModelInfo { status: string; accuracy?: number; roc_auc?: number; cv_roc_auc_mean?: number; cv_roc_auc_std?: number; training_samples?: number; seasons?: number[] }
export interface ChatMessage { role: 'user' | 'assistant'; content: string; sources?: ChatSource[] }
export interface ChatSource { title: string; category: string; similarity: number; excerpt?: string }
export interface ChatResponse { answer: string; sources: ChatSource[]; model: string; docs_retrieved: number }
export interface AgentStep { step: number; type: 'thinking' | 'tool_call' | 'tool_result' | 'answer'; content: string; tool?: string; args?: Record<string, any>; data?: any }
export interface AgentResponse { answer: string; steps: AgentStep[]; tools_used: string[]; tool_results: Array<{ tool: string; args: any; result: any }>; iterations: number; ollama_available?: boolean }
export interface FormationData { team: string; total_plays: number; chart: { labels: string[]; epa: number[]; usage: number[]; plays: number[]; success_rate: number[] }; insight: string }
export interface FormationDiagram { formation: string; description: string; image_base64: string; mime_type: string }
export interface ImageAnalysis { circles_detected: number; formation_estimate: string; confidence: string; spatial_analysis?: { horizontal_spread: number; vertical_spread: number }; player_positions?: Array<{ x: number; y: number; radius: number }>; note: string }

export const nflApi = {
  getAllTeams: () => api.get<TeamStats[]>('/ml/teams').then(r => r.data),
  getMatchup: (home: string, away: string) => api.get<MatchupResult>(`/ml/matchup/${home}/${away}`).then(r => r.data),
  getHotSeat: (team: string, games = 3) => api.get<HotSeatResult>(`/ml/hot-seat/${team}?last_games=${games}`).then(r => r.data),
  getModelInfo: () => api.get<ModelInfo>('/ml/model-info').then(r => r.data),
  getRagStatus: () => api.get('/rag/status').then(r => r.data),
  ingestDocuments: (force = false) => api.post(`/rag/ingest?force=${force}`).then(r => r.data),
  chat: (question: string, history: ChatMessage[] = []) => api.post<ChatResponse>('/rag/chat', { question, history: history.map(m => ({ role: m.role, content: m.content })) }).then(r => r.data),
  askAgent: (question: string, history: ChatMessage[] = []) => api.post<AgentResponse>('/agent/ask', { question, history: history.map(m => ({ role: m.role, content: m.content })) }).then(r => r.data),
  getFormationsData: (team?: string) => api.get<FormationData>('/vision/formations/data', { params: team ? { team } : {} }).then(r => r.data),
  getFormationDiagram: (name: string) => api.get<FormationDiagram>(`/vision/formations/diagram/${encodeURIComponent(name)}`).then(r => r.data),
  listFormations: () => api.get<{ formations: Array<{ name: string; description: string }> }>('/vision/formations/list').then(r => r.data),
  analyzeImage: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post<ImageAnalysis>('/vision/analyze-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data) },
}
