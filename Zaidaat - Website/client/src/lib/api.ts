export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data && 'error' in data && String((data as any).error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, typeof data === 'object' ? (data as any).details : undefined);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export async function uploadFiles(files: FileList | File[]): Promise<Array<{ url: string; mediaType: 'image' | 'video' | 'document'; originalName: string }>> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('files', f));
  const res = await api.post<{ files: Array<{ url: string; mediaType: 'image' | 'video' | 'document'; originalName: string }> }>('/api/uploads', form);
  return res.files;
}

export async function uploadKycFiles(files: FileList | File[]): Promise<Array<{ url: string; mediaType: 'image' | 'video' | 'document'; originalName: string }>> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('files', f));
  const res = await api.post<{ files: Array<{ url: string; mediaType: 'image' | 'video' | 'document'; originalName: string }> }>('/api/uploads/kyc', form);
  return res.files;
}
