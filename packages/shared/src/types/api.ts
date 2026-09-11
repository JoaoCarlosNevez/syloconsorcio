// Standard API response envelope used by all endpoints.
// Consistent shape makes frontend error handling predictable.

export type ApiSuccess<T> = {
  data: T
  message: string
}

export type ApiError = {
  error: string
  status: number
  details?: Record<string, string[]>
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
