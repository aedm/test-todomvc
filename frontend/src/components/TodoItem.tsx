import { KeyboardEvent, useRef, useState } from 'react';
import type { Todo } from '../api';

type Props = {
  todo: Todo;
  onToggle: () => void;
  onEdit: (title: string) => void;
  onDelete: () => void;
};

export function TodoItem({ todo, onToggle, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(todo.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    onEdit(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(todo.title);
      setEditing(false);
    }
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
        className="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-label="Edit todo"
          className="flex-1 rounded-md border border-blue-300 px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={startEdit}
          className={`flex-1 truncate text-left text-base ${
            todo.completed ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}
        >
          {todo.title}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete "${todo.title}"`}
        className="rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-200 group-hover:opacity-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}
