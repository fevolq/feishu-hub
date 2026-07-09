type ApiErrorBody = {
  error?: string;
};

type ReadApiJsonOptions = {
  redirectOnUnauthorized?: boolean;
};

export const readApiJson = async <T>(
  response: Response,
  fallbackMessage: string,
  options: ReadApiJsonOptions = {}
): Promise<T> => {
  const body = (await response.json().catch(() => null)) as (T & ApiErrorBody) | null;

  if (response.status === 401 && options.redirectOnUnauthorized !== false) {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
    throw new Error("登录已过期，请重新登录");
  }

  if (!response.ok) {
    throw new Error(body?.error || fallbackMessage);
  }

  return (body || {}) as T;
};
