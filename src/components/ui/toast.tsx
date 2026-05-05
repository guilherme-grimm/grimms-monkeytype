import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto pixel-border toast-enter px-5 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-[var(--color-primary-glow)]/15 text-[var(--color-primary-glow)]'
              : toast.type === 'error'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'bg-[rgba(255,255,255,0.05)] text-[var(--color-muted)]'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
