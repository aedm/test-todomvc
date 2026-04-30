import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  Todo,
  createTodo as apiCreate,
  deleteTodo as apiDelete,
  listTodos,
  updateTodo as apiUpdate,
} from './api';
import { TodoItem } from './components/TodoItem';
import { Composer } from './components/Composer';
import { FilterBar, Filter } from './components/FilterBar';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTodos()
      .then((items) => setTodos(items))
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  const remaining = todos.filter((t) => !t.completed).length;

  async function handleCreate(title: string) {
    try {
      const todo = await apiCreate({ title });
      setTodos((cur) => [todo, ...cur]);
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  async function handleToggle(todo: Todo) {
    const next = !todo.completed;
    setTodos((cur) => cur.map((t) => (t.id === todo.id ? { ...t, completed: next } : t)));
    try {
      const updated = await apiUpdate(todo.id, { completed: next });
      setTodos((cur) => cur.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setTodos((cur) => cur.map((t) => (t.id === todo.id ? todo : t)));
      setError(messageOf(e));
    }
  }

  async function handleEdit(todo: Todo, title: string) {
    const trimmed = title.trim();
    if (!trimmed) {
      await handleDelete(todo);
      return;
    }
    if (trimmed === todo.title) return;
    try {
      const updated = await apiUpdate(todo.id, { title: trimmed });
      setTodos((cur) => cur.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setError(messageOf(e));
    }
  }

  async function handleDelete(todo: Todo) {
    const before = todos;
    setTodos((cur) => cur.filter((t) => t.id !== todo.id));
    try {
      await apiDelete(todo.id);
    } catch (e) {
      setTodos(before);
      setError(messageOf(e));
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Todos</h1>
        <span className="text-sm text-slate-500" aria-live="polite">
          {remaining} {remaining === 1 ? 'item' : 'items'} left
        </span>
      </header>

      <Composer onSubmit={handleCreate} />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {todos.length === 0 ? 'No todos yet. Add one above.' : 'Nothing here.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <TodoItem
                key={t.id}
                todo={t}
                onToggle={() => handleToggle(t)}
                onEdit={(title) => handleEdit(t, title)}
                onDelete={() => handleDelete(t)}
              />
            ))}
          </ul>
        )}
      </section>

      <FilterBar value={filter} onChange={setFilter} counts={countsOf(todos)} />

      <footer className="mt-10 text-center text-xs text-slate-400">
        Stored in Cloudflare D1. Built with Rust + React.
      </footer>
    </main>
  );
}

function countsOf(todos: Todo[]) {
  const completed = todos.filter((t) => t.completed).length;
  return { all: todos.length, active: todos.length - completed, completed };
}

function messageOf(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}
