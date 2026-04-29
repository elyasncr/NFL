import { useQuery } from '@tanstack/react-query'
import { nflApi, TeamInfo } from '../api/nflApi'

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
  return data.find(t => t.abbr === abbr.toUpperCase())
}
