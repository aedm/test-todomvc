import { FormEvent, useState } from 'react';

type Props = {
  onSubmit: (title: string) => void | Promise<void>;
};

export function Composer({ onSubmit }: Props) {
  const [value, setValue] = useState('');

  async function handle(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue('');
    await onSubmit(trimmed);
  }

  return (
    <form onSubmit={handle} className="mb-4">
      <label htmlFor="new-todo" className="sr-only">
        New todo
      </label>
      <input
        id="new-todo"
        name="title"
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What needs doing?"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </form>
  );
}
