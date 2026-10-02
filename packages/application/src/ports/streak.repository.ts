// IStreakRepository — port da ofensiva (Perfil): em quais dias o usuário
// trabalhou no CRM.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// A fonte é o log de atividades: um dia conta quando o usuário fez alguma
// das ações de STREAK_ACTIONS (ver GetMyStreakUseCase), em qualquer
// organização. Só logar não conta.

export interface IStreakRepository {
  /** Dias (YYYY-MM-DD, horário de Brasília) com alguma ação que conta pra
   * ofensiva, em ordem crescente, sem repetição. */
  listActiveDays(userId: string): Promise<string[]>
}
