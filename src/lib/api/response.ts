import { NextResponse } from "next/server";

export type Order = "asc" | "desc";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface APIResponseMeta {
  pagination?: PaginationInfo;
  timestamp: string;
  requestId: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: APIResponseMeta;
  // Optional extra fields frequently used by bulk operations
  summary?: unknown;
}

export interface APIErrorOptions {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  requestId?: string;
}

export function generateRequestId(): string {
  // Lightweight unique id (avoid bringing extra deps)
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function success<T>(
  data: T,
  options?: {
    pagination?: PaginationInfo;
    requestId?: string;
  }
) {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      pagination: options?.pagination,
      timestamp: nowIso(),
      requestId: options?.requestId ?? generateRequestId(),
    },
  };
  return NextResponse.json(response);
}

export function successWith<T>(
  payload: Omit<APIResponse<T>, "success"> & { success?: boolean }
) {
  const response: APIResponse<T> = {
    success: true,
    ...payload,
    meta: {
      ...(payload.meta || {}),
      timestamp: payload.meta?.timestamp ?? nowIso(),
      requestId: payload.meta?.requestId ?? generateRequestId(),
    },
  } as APIResponse<T>;
  return NextResponse.json(response);
}

export function failure(options: APIErrorOptions) {
  const { code, message, status = 400, details, requestId } = options;
  const response: APIResponse<never> = {
    success: false,
    error: message,
    code,
    details,
    meta: {
      timestamp: nowIso(),
      requestId: requestId ?? generateRequestId(),
    },
  };
  return NextResponse.json(response, { status });
}

export function handleException(
  error: unknown,
  fallbackCode = "INTERNAL_ERROR"
) {
  if (error && typeof error === "object") {
    const anyErr = error as any;
    const status: number | undefined = anyErr.status || anyErr.statusCode;
    const code: string = anyErr.code || fallbackCode;
    const message: string = anyErr.message || "Internal server error";
    const details = anyErr.details || anyErr.stack || undefined;
    return failure({ code, message, status: status ?? 500, details });
  }
  return failure({
    code: fallbackCode,
    message: "Internal server error",
    status: 500,
  });
}

// Build a successful API payload without returning a NextResponse
export function buildResponse<T>(payload: {
  data?: T;
  pagination?: PaginationInfo;
  summary?: unknown;
  meta?: Partial<APIResponseMeta>;
}): APIResponse<T> {
  return {
    success: true,
    data: payload.data as T,
    summary: payload.summary,
    meta: {
      pagination: payload.pagination,
      timestamp: payload.meta?.timestamp || nowIso(),
      requestId: payload.meta?.requestId || generateRequestId(),
    },
  };
}

// Standard API error handler for route catch blocks
export function handleApiError(error: unknown, context?: string) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(`[API ERROR${context ? " " + context : ""}]`, error);
  }
  return handleException(error);
}
