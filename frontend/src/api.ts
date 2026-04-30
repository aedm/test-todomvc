export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  created_at: number;
};

export type CreateTodo = { title: string };
export type UpdateTodo = { title?: string; completed?: boolean };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function jsonOrThrow(res: Response): Promise<unknown> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body && typeof body.error === 'string') msg = body.error;
    } catch {
      // body may be empty
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

const headers = { 'content-type': 'application/json' };

export async function listTodos(): Promise<Todo[]> {
  const res = await fetch('/api/todos');
  return (await jsonOrThrow(res)) as Todo[];
}

export async function createTodo(input: CreateTodo): Promise<Todo> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as Todo;
}

export async function updateTodo(id: string, input: UpdateTodo): Promise<Todo> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as Todo;
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await jsonOrThrow(res);
}
