import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createTodo, deleteTodo, listTodos, updateTodo } from '../api';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('listTodos', () => {
  it('GETs /api/todos and returns the array', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes([{ id: 'a', title: 'x', completed: false, created_at: 1 }]),
    );
    const todos = await listTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('x');
    expect(fetchMock).toHaveBeenCalledWith('/api/todos');
  });

  it('throws ApiError when server returns non-2xx', async () => {
    fetchMock.mockImplementation(async () => jsonRes({ error: 'boom' }, 500));
    await expect(listTodos()).rejects.toBeInstanceOf(ApiError);
    await expect(listTodos()).rejects.toMatchObject({ status: 500, message: 'boom' });
  });
});

describe('createTodo', () => {
  it('POSTs JSON body and returns created todo', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes({ id: '1', title: 'buy', completed: false, created_at: 100 }, 201),
    );
    const todo = await createTodo({ title: 'buy' });
    expect(todo.id).toBe('1');
    expect(fetchMock).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'buy' }),
    });
  });

  it('surfaces validation errors with status', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ error: 'title must not be empty' }, 422));
    await expect(createTodo({ title: '' })).rejects.toMatchObject({ status: 422 });
  });
});

describe('updateTodo', () => {
  it('PATCHes the right URL', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes({ id: 'abc', title: 't', completed: true, created_at: 1 }),
    );
    await updateTodo('abc', { completed: true });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/todos/abc');
    expect(opts.method).toBe('PATCH');
    expect(opts.body).toBe(JSON.stringify({ completed: true }));
  });

  it('encodes id in path', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes({ id: 'a/b', title: 't', completed: false, created_at: 1 }),
    );
    await updateTodo('a/b', { title: 'x' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/todos/a%2Fb');
  });
});

describe('deleteTodo', () => {
  it('DELETEs and accepts 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteTodo('xyz')).resolves.toBeUndefined();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/todos/xyz');
    expect(opts.method).toBe('DELETE');
  });

  it('throws when not found', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ error: 'todo not found' }, 404));
    await expect(deleteTodo('nope')).rejects.toMatchObject({ status: 404 });
  });
});
