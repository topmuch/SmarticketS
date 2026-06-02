interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

/** Default timeout for all API requests (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10_000;

class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = localStorage.getItem("st_access_token");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Apply AbortController timeout if no signal provided
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const signal = options.signal || controller.signal;

    try {
      const response = await fetch(path, {
        ...options,
        headers,
        signal,
      });

      if (response.status === 401) {
        // Try to refresh the token
        const newToken = await this.refreshToken();
        if (newToken) {
          // Retry the original request with the new token
          headers["Authorization"] = `Bearer ${newToken}`;
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), DEFAULT_TIMEOUT_MS);
          const retrySignal = options.signal || retryController.signal;

          try {
            const retryResponse = await fetch(path, {
              ...options,
              headers,
              signal: retrySignal,
            });

            if (!retryResponse.ok) {
              await this.handleErrorResponse(retryResponse);
            }

            return retryResponse.json() as Promise<T>;
          } finally {
            clearTimeout(retryTimeoutId);
          }
        }

        // Refresh failed - force logout
        this.clearAuth();
        window.location.reload();
        throw new Error("Session expiree. Veuillez vous reconnecter.");
      }

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return response.json() as Promise<T>;
    } catch (err) {
      // Re-throw AbortError with a user-friendly message
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("La requete a expire. Verifiez votre connexion et reessayez.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async refreshToken(): Promise<string | null> {
    // Use a single refresh promise to avoid multiple concurrent refreshes
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._refreshToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("st_refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearAuth();
        return null;
      }

      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      // Save BOTH tokens from rotation response
      localStorage.setItem("st_access_token", data.accessToken);
      localStorage.setItem("st_refresh_token", data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError;
    try {
      errorData = (await response.json()) as ApiError;
    } catch {
      errorData = { error: `Request failed with status ${response.status}` };
    }

    if (response.status === 403) {
      throw new Error(errorData.error || "Acces interdit.");
    }
    if (response.status === 404) {
      throw new Error(errorData.error || "Ressource introuvable.");
    }
    if (response.status === 409) {
      throw new Error(errorData.error || "Conflit de donnees.");
    }
    if (response.status === 429) {
      throw new Error(
        errorData.error || "Trop de requetes. Veuillez reessayer plus tard."
      );
    }

    throw new Error(errorData.error || "Une erreur est survenue.");
  }

  private clearAuth(): void {
    localStorage.removeItem("st_access_token");
    localStorage.removeItem("st_refresh_token");
  }
}

export const apiClient = new ApiClient();
