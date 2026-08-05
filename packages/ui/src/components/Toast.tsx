'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ToastMessage {
  id: number;
  title: string;
  tone: 'success' | 'danger';
}

interface ToastContextValue {
  showToast: (title: string, tone?: ToastMessage['tone']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, tone: ToastMessage['tone'] = 'success') => {
    setMessages((current) => [...current, { id: Date.now(), title, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {messages.map((message) => (
          <RadixToast.Root
            key={message.id}
            duration={4000}
            onOpenChange={(open) => {
              if (!open) {
                setMessages((current) => current.filter((m) => m.id !== message.id));
              }
            }}
            className={cn(
              'rounded-[var(--radius-md)] border bg-surface-raised p-4 shadow-[var(--shadow-md)]',
              message.tone === 'danger' ? 'border-danger/30' : 'border-success/30',
            )}
          >
            <RadixToast.Title
              className={cn(
                'text-sm font-medium',
                message.tone === 'danger' ? 'text-danger' : 'text-success',
              )}
            >
              {message.title}
            </RadixToast.Title>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[var(--z-toast)] flex w-[min(90vw,360px)] flex-col gap-2" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
