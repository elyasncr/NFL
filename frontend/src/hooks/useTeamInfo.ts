import { useQuery } from '@tanstack/react-query'
import { nflApi, TeamInfo } from '../api/nflApi'

// nfl_data_py preserva abbrs históricas no pbp; import_team_desc usa as atuais.
// Normaliza pra abbr canônica antes de buscar metadata.
const ABBR_ALIASES: Record<string, string> = {
  LA: 'LAR',
  STL: 'LAR',
  SD: 'LAC',
  OAK: 'LV',
}

export function normalizeAbbr(abbr: string): string {
  const up = abbr.toUpperCase()
  return ABBR_ALIASES[up] ?? up
}

/**
 * Carrega metadata dos 32 times. Cache infinito —
 * dados não mudam durante a sessão.
 */
export function useTeamsInfo() {
  return useQuery<TeamInfo[]>({
    queryKey: ['teams-info'],
    queryFn: nflApi.getTeamsInfo,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * Retorna metadata de um time específico ou undefined enquanto
 * o cache ainda não está pronto / abbr inválido.
 */
export function useTeam(abbr: string | undefined): TeamInfo | undefined {
  const { data } = useTeamsInfo()
  if (!abbr || !data) return undefined
  const canonical = normalizeAbbr(abbr)
  return data.find(t => t.abbr === canonical)
}
