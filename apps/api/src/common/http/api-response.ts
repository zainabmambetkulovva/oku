/** Успешный ответ API. Списки дополнительно содержат meta (пагинация). */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Ответ API с ошибкой. Единый формат для всех ошибок. */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

/** Ошибка валидации одного поля запроса. */
export interface ValidationErrorDetail {
  field: string;
  errors: string[];
}
