import type { ApiClient } from "./client";

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export function createAuthApi(client: ApiClient) {
  return {
    async login(email: string, password: string): Promise<LoginResponse> {
      return client.post<LoginResponse>("/api/auth/mobile/login", { email, password });
    },

    async loginWithGoogle(idToken: string): Promise<LoginResponse> {
      return client.post<LoginResponse>("/api/auth/mobile/google", { idToken });
    },

    async register(data: RegisterInput): Promise<LoginResponse> {
      return client.post<LoginResponse>("/api/auth/mobile/register", data);
    },

    async refresh(token: string): Promise<LoginResponse> {
      return client.post<LoginResponse>("/api/auth/mobile/refresh", { token });
    },
  };
}
