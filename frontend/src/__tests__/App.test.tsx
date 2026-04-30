import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

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

function todo(id: string, title: string, completed = false, created_at = 1) {
  return { id, title, completed, created_at };
}

describe('App', () => {
  it('shows the empty state when there are no todos', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes([]));
    render(<App />);
    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument();
  });

  it('lists todos from the API', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes([todo('1', 'first'), todo('2', 'second', true)]));
    render(<App />);
    expect(await screen.findByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText(/1 item left/i)).toBeInTheDocument();
  });

  it('adds a todo', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonRes([])); // initial list
    fetchMock.mockResolvedValueOnce(jsonRes(todo('new-1', 'buy milk'), 201));
    render(<App />);
    await screen.findByText(/no todos yet/i);

    await user.type(screen.getByLabelText(/new todo/i), 'buy milk{Enter}');

    expect(await screen.findByText('buy milk')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toBe('/api/todos');
    expect(postCall[1].method).toBe('POST');
  });

  it('toggles a todo complete', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonRes([todo('1', 'task')]));
    fetchMock.mockResolvedValueOnce(jsonRes(todo('1', 'task', true)));
    render(<App />);

    const cb = await screen.findByLabelText(/mark "task" as complete/i);
    await user.click(cb);

    await waitFor(() => {
      expect((cb as HTMLInputElement).checked).toBe(true);
    });
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toBe('/api/todos/1');
    expect(patchCall[1].method).toBe('PATCH');
    expect(patchCall[1].body).toBe(JSON.stringify({ completed: true }));
  });

  it('deletes a todo', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonRes([todo('1', 'gone soon')]));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<App />);

    const item = await screen.findByText('gone soon');
    const li = item.closest('li')!;
    await user.click(within(li).getByLabelText(/delete "gone soon"/i));

    await waitFor(() => {
      expect(screen.queryByText('gone soon')).not.toBeInTheDocument();
    });
    const delCall = fetchMock.mock.calls[1];
    expect(delCall[0]).toBe('/api/todos/1');
    expect(delCall[1].method).toBe('DELETE');
  });

  it('filters to active and completed', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonRes([todo('1', 'open'), todo('2', 'done', true)]));
    render(<App />);
    await screen.findByText('open');

    await user.click(screen.getByRole('button', { name: /^Active/ }));
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.queryByText('done')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Completed/ }));
    expect(screen.queryByText('open')).not.toBeInTheDocument();
    expect(screen.getByText('done')).toBeInTheDocument();
  });

  it('shows an error when the API fails on load', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ error: 'down' }, 500));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('down');
  });

  it('rolls back optimistic toggle when the API rejects', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonRes([todo('1', 'will fail')]));
    fetchMock.mockResolvedValueOnce(jsonRes({ error: 'no' }, 500));
    render(<App />);

    const cb = await screen.findByLabelText(/mark "will fail" as complete/i);
    await user.click(cb);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('no');
    });
    expect((cb as HTMLInputElement).checked).toBe(false);
  });
});
