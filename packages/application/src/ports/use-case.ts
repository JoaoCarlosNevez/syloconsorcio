// Base interface for all application use cases.
//
// Use cases are the single entry point into application logic.
// They orchestrate domain entities, call repository ports,
// and never know how data is persisted or transported.
//
// TInput  — data received from the HTTP layer (already validated and typed)
// TOutput — data returned to the HTTP layer (never raw database rows)

export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}
