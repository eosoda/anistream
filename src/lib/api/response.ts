import { NextRequest, NextResponse } from 'next/server';

export interface ApiSuccessMeta {
  page?: number;
  limit?: number;
  total?: number;
  cached?: boolean;
  offline?: boolean;
  [key: string]: any;
}

export interface ApiSuccessPayload<T> {
  success: true;
  data: T;
  meta?: ApiSuccessMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiErrorPayload {
  success: false;
  error: ApiErrorDetail;
  timestamp: string;
}

interface SuccessOptions {
  status?: number;
  meta?: ApiSuccessMeta;
  headers?: Record<string, string>;
}

/**
 * Log estruturado em formato JSON para serviços de monitoramento (Grafana/Datadog)
 */
function logApiEvent(
  level: 'info' | 'warn' | 'error',
  path: string,
  statusCode: number,
  message: string,
  meta?: Record<string, any>
) {
  const logPayload = {
    timestamp: new Date().toISOString(),
    level,
    path,
    statusCode,
    message,
    ...meta,
  };

  if (level === 'error') {
    console.error(JSON.stringify(logPayload));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.log(JSON.stringify(logPayload));
  }
}

/**
 * Retorna uma resposta HTTP padronizada de Sucesso
 */
export function apiSuccess<T>(
  data: T,
  options: SuccessOptions = {}
): NextResponse<ApiSuccessPayload<T>> {
  const status = options.status || 200;
  const payload: ApiSuccessPayload<T> = {
    success: true,
    data,
    ...(options.meta ? { meta: options.meta } : {}),
  };

  const responseHeaders = new Headers(options.headers || {});
  if (!responseHeaders.has('Content-Type')) {
    responseHeaders.set('Content-Type', 'application/json');
  }

  return NextResponse.json(payload, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Retorna uma resposta HTTP padronizada de Erro
 */
export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: any,
  headers?: Record<string, string>,
  reqPath: string = '/api'
): NextResponse<ApiErrorPayload> {
  const payload: ApiErrorPayload = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  logApiEvent(status >= 500 ? 'error' : 'warn', reqPath, status, message, {
    code,
    details,
  });

  const responseHeaders = new Headers(headers || {});
  if (!responseHeaders.has('Content-Type')) {
    responseHeaders.set('Content-Type', 'application/json');
  }
  if (!responseHeaders.has('Cache-Control')) {
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }

  return NextResponse.json(payload, {
    status,
    headers: responseHeaders,
  });
}
