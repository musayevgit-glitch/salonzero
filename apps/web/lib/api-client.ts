'use client';

const API_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: 'Something went wrong. Please try again.' }));
    throw new ApiError(res.status, body.message ?? 'Something went wrong. Please try again.');
  }

  return res.json();
}
