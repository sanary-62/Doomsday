const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Error carrying the backend's machine-readable code, message and field details. */
export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const request = async (path, { method = 'GET', body } = {}) => {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check that the API is running and try again.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error || 'UNKNOWN_ERROR',
      payload?.message || `Request failed with status ${response.status}.`,
      payload?.details || []
    );
  }
  return payload;
};

export const moviesApi = {
  list: () => request('/movies'),
  create: (movie) => request('/movies', { method: 'POST', body: movie }),
  update: (id, changes) => request(`/movies/${id}`, { method: 'PATCH', body: changes }),
  remove: (id, { force = false } = {}) =>
    request(`/movies/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  rewatchOrder: (id) => request(`/movies/${id}/rewatch-order`),
};

export const cinemasApi = {
  list: () => request('/cinemas'),
  create: (cinema) => request('/cinemas', { method: 'POST', body: cinema }),
  quote: (id, groupSize) => request(`/cinemas/${id}/booking?groupSize=${encodeURIComponent(groupSize)}`),
};
