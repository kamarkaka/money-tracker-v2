import * as crypto from "crypto";

function buildAuthCode(
  userId: string,
  accessKey: string,
  httpMethod: string,
  url: string,
): string {
  const authPath = httpMethod.toUpperCase() + "\n" + url.toLowerCase();
  const hmac = crypto.createHmac("sha256", Buffer.from(accessKey, "base64"));
  hmac.update(authPath);
  const hash = hmac.digest("base64");
  return `FIApiAUTH:${userId}:${hash}:${url.toLowerCase()}`;
}

export class BaseClient {
  private baseUrl: string;
  private userId: string;
  private accessKey: string;

  constructor() {
    const baseUrl = process.env.SOPHTRON_BASE_URL;
    const userId = process.env.SOPHTRON_USER_ID;
    const accessKey = process.env.SOPHTRON_ACCESS_KEY;

    if (!baseUrl || !userId || !accessKey) {
      throw new Error(
        "Missing required Sophtron environment variables: SOPHTRON_BASE_URL, SOPHTRON_USER_ID, SOPHTRON_ACCESS_KEY",
      );
    }

    // Remove trailing slash for consistent URL building
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.userId = userId;
    this.accessKey = accessKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const authCode = buildAuthCode(this.userId, this.accessKey, method, path);

    const headers: Record<string, string> = {
      Authorization: authCode,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sophtron API error ${response.status}: ${text}`);
    }

    // Some endpoints return empty responses (e.g. DELETE)
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
