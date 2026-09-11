// Pagination types — mandatory for all list endpoints.
//
// P0 requirement: the system must support 20,000 leads per tenant.
// All list queries must be paginated server-side.
// Never load unbounded collections into the client.

export type PaginationParams = {
  page: number
  limit: number
  cursor?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    nextCursor?: string
  }
}

export type SortOrder = 'asc' | 'desc'

export type SortParams = {
  field: string
  order: SortOrder
}

export type FilterParams = Record<string, string | number | boolean | undefined>

export type ListParams = {
  pagination: PaginationParams
  sort?: SortParams
  filters?: FilterParams
  search?: string
}
