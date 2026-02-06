'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Plus, X, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { useTodos, TodoItem } from '@/hooks/use-tasks';

interface TodoDrawerProps {
  defaultOpen?: boolean;
  onToggleChange?: (isOpen: boolean) => void;
}

function TodoCheckbox({ 
  checked, 
  onChange 
}: { 
  checked: boolean; 
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`
        w-4 h-4 rounded border flex items-center justify-center shrink-0
        transition-all duration-300 ease-out
        ${checked 
          ? 'bg-green-500 border-green-500' 
          : 'border-zinc-600 hover:border-zinc-400'
        }
      `}
    >
      <Check 
        className={`
          w-2.5 h-2.5 text-white transition-all duration-300
          ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
        `}
        strokeWidth={3}
      />
    </button>
  );
}

function TodoItemRow({ 
  todo, 
  onToggle, 
  onRemove 
}: { 
  todo: TodoItem; 
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div 
      className="group flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <TodoCheckbox checked={todo.completed} onChange={onToggle} />
      <span 
        className={`
          flex-1 text-sm leading-relaxed
          transition-all duration-300
          ${todo.completed ? 'line-through text-zinc-500' : 'text-zinc-300'}
        `}
      >
        {todo.text}
      </span>
      <button
        onClick={onRemove}
        className={`
          p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10
          transition-all duration-200
          ${showDelete ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function TodoDrawer({ defaultOpen = true, onToggleChange }: TodoDrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { todos, loading, addTodo, toggleTodo, removeTodo } = useTodos();

  const pendingCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  // Sync with external state
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggleChange?.(newState);
  };

  const handleAddTodo = () => {
    if (!inputValue.trim()) return;
    addTodo(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodo();
    }
  };

  return (
    <div 
      className={`
        fixed right-0 top-0 h-full z-40
        transition-all duration-300 ease-out
        ${isOpen ? 'w-[300px]' : 'w-12'}
      `}
    >
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`
          absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
          w-6 h-12 rounded-l-lg bg-zinc-800 border border-zinc-700 border-r-0
          flex items-center justify-center text-zinc-400 hover:text-zinc-200
          transition-colors z-50
        `}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Collapsed state indicator */}
      {!isOpen && (
        <div className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col items-center pt-20 gap-2">
          <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-400">{pendingCount}</span>
          </div>
          <span className="text-[10px] text-zinc-500 writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
            Todos
          </span>
        </div>
      )}

      {/* Drawer content */}
      <div 
        className={`
          h-full bg-zinc-900 border-l border-zinc-800
          flex flex-col
          transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-zinc-100">Quick Todos</h2>
            <div className="flex items-center gap-2 text-xs">
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  {pendingCount}
                </span>
              )}
              {completedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  ✓{completedCount}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-500">Personal task list</p>
        </div>

        {/* Quick add input */}
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a todo..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            <button
              onClick={handleAddTodo}
              disabled={!inputValue.trim()}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Todo list */}
        <div 
          className="flex-1 overflow-y-auto p-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              Loading...
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
              <Check className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm">No todos yet</span>
              <span className="text-xs mt-1">Add one above!</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Pending todos first */}
              {todos
                .filter(t => !t.completed)
                .map(todo => (
                  <TodoItemRow 
                    key={todo.id} 
                    todo={todo} 
                    onToggle={() => toggleTodo(todo.id)}
                    onRemove={() => removeTodo(todo.id)}
                  />
                ))}
              
              {/* Completed todos with separator */}
              {completedCount > 0 && pendingCount > 0 && (
                <div className="my-3 border-t border-zinc-800" />
              )}
              
              {todos
                .filter(t => t.completed)
                .map(todo => (
                  <TodoItemRow 
                    key={todo.id} 
                    todo={todo} 
                    onToggle={() => toggleTodo(todo.id)}
                    onRemove={() => removeTodo(todo.id)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {completedCount > 0 && (
          <div className="p-3 border-t border-zinc-800">
            <button
              onClick={() => {
                todos.filter(t => t.completed).forEach(t => removeTodo(t.id));
              }}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
            >
              Clear completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
