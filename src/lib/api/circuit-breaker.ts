export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Número de falhas para abrir o circuito (Padrão: 5)
  windowMs?: number;         // Janela de tempo das falhas (Padrão: 60000ms = 1 minuto)
  resetTimeoutMs?: number;   // Tempo para tentar transição Half-Open (Padrão: 30000ms = 30s)
}

interface ProviderStatus {
  state: CircuitState;
  failures: number[];
  lastStateChange: number;
}

export class CircuitBreaker {
  private providers = new Map<string, ProviderStatus>();
  private failureThreshold: number;
  private windowMs: number;
  private resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.windowMs = options.windowMs || 60000;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
  }

  private getProviderStatus(providerName: string): ProviderStatus {
    let status = this.providers.get(providerName);
    if (!status) {
      status = {
        state: 'CLOSED',
        failures: [],
        lastStateChange: Date.now(),
      };
      this.providers.set(providerName, status);
    }
    return status;
  }

  public getState(providerName: string): CircuitState {
    const status = this.getProviderStatus(providerName);
    const now = Date.now();

    // Se estiver OPEN e tiver passado o tempo de reset, transiciona para HALF_OPEN
    if (status.state === 'OPEN' && now - status.lastStateChange >= this.resetTimeoutMs) {
      status.state = 'HALF_OPEN';
      status.lastStateChange = now;
    }

    return status.state;
  }

  public recordSuccess(providerName: string): void {
    const status = this.getProviderStatus(providerName);
    status.failures = [];
    if (status.state !== 'CLOSED') {
      status.state = 'CLOSED';
      status.lastStateChange = Date.now();
    }
  }

  public recordFailure(providerName: string): void {
    const status = this.getProviderStatus(providerName);
    const now = Date.now();

    // Remove falhas fora da janela de tempo (windowMs)
    status.failures = status.failures.filter((t) => now - t <= this.windowMs);
    status.failures.push(now);

    if (status.failures.length >= this.failureThreshold) {
      status.state = 'OPEN';
      status.lastStateChange = now;
    }
  }

  /**
   * Executa uma ação primária protegida pelo Circuit Breaker.
   * Se o circuito estiver OPEN, executa imediatamente a função de fallback sem chamar o serviço externo.
   */
  public async execute<T>(
    providerName: string,
    action: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<{ data: T; isFallback: boolean }> {
    const currentState = this.getState(providerName);

    if (currentState === 'OPEN') {
      const fallbackData = await fallback();
      return { data: fallbackData, isFallback: true };
    }

    try {
      const result = await action();
      this.recordSuccess(providerName);
      return { data: result, isFallback: false };
    } catch (error) {
      this.recordFailure(providerName);

      try {
        const fallbackData = await fallback();
        return { data: fallbackData, isFallback: true };
      } catch (fallbackError) {
        throw error;
      }
    }
  }
}

// Singleton global para a aplicação
export const globalCircuitBreaker = new CircuitBreaker();
