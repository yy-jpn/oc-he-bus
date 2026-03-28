export class HrApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "HrApiError";
  }
}

interface HrApiClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

/**
 * 外部HR API用HTTPクライアント。
 * レートリミット(429)検出+Retry-After対応、
 * 5xxエクスポネンシャルバックオフ(1s→2s→4s)を内蔵。
 */
export class HrApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(options: HrApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (options?.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: { ...this.defaultHeaders, ...options?.headers },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return (await response.json()) as T;
        }

        // Rate limit: Retry-After ヘッダーを尊重
        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            const retryAfter = response.headers.get("Retry-After");
            const waitMs = retryAfter
              ? parseInt(retryAfter, 10) * 1_000
              : INITIAL_BACKOFF_MS * 2 ** attempt;
            await sleep(Math.min(waitMs, 30_000));
            continue;
          }
          throw new HrApiError(429, "Rate limit exceeded", true);
        }

        // 5xx: エクスポネンシャルバックオフ
        if (response.status >= 500) {
          if (attempt < MAX_RETRIES) {
            await sleep(INITIAL_BACKOFF_MS * 2 ** attempt);
            continue;
          }
          const body = await response.text().catch(() => "");
          throw new HrApiError(
            response.status,
            `Server error: ${response.statusText} ${body}`.trim(),
            true
          );
        }

        // 4xx (429以外): リトライ不要
        const errorBody = await response.text().catch(() => "");
        throw new HrApiError(
          response.status,
          `API error ${response.status}: ${errorBody || response.statusText}`,
          false
        );
      } catch (error) {
        if (error instanceof HrApiError) throw error;

        lastError = error as Error;
        if ((error as Error).name === "AbortError") {
          if (attempt < MAX_RETRIES) {
            await sleep(INITIAL_BACKOFF_MS * 2 ** attempt);
            continue;
          }
          throw new HrApiError(0, "Request timeout", true);
        }

        if (attempt < MAX_RETRIES) {
          await sleep(INITIAL_BACKOFF_MS * 2 ** attempt);
          continue;
        }
      }
    }

    throw new HrApiError(
      0,
      `Network error: ${lastError?.message ?? "Unknown"}`,
      true
    );
  }

  /**
   * 接続テスト用: 軽量なGETリクエストを1回だけ実行する（リトライなし）。
   */
  async testConnection(path: string): Promise<{ ok: boolean; message: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: this.defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { ok: true, message: "接続成功" };
      }

      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: "認証エラー: APIキーまたはアクセストークンを確認してください" };
      }

      return {
        ok: false,
        message: `エラー (${response.status}): ${response.statusText}`,
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return { ok: false, message: "タイムアウト: サーバーに接続できません" };
      }
      return {
        ok: false,
        message: `接続エラー: ${(error as Error).message}`,
      };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
