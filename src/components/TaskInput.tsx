import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

interface TaskInputProps {
  onAdd: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

export default function TaskInput({ onAdd, onFocusChange }: TaskInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const text = value.trim();
    if (!text) return;
    onAdd(text);
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <div className="task-input-bar">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        placeholder="Add a task..."
        id="task-input"
      />
      <button
        className="btn-add"
        onClick={handleSubmit}
        id="btn-add-task"
        disabled={!value.trim()}
        style={value.trim() ? {} : {
          background: 'transparent',
          border: '2px dashed var(--clr-border)',
          color: 'var(--clr-text-muted)',
          cursor: 'default',
        }}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
