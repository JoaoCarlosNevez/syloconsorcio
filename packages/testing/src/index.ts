// Testing utilities — shared test helpers, fixtures, and factories.
//
// Architecture tests live in src/arch/ and run independently via test:arch.
// They verify that layer boundaries are never violated.
//
// Test utilities will be added here as features are implemented:
//   - Entity factories (e.g., makeOrganization(), makeMembership())
//   - In-memory repository implementations for unit testing use cases
//   - Request injection helpers for API integration tests
