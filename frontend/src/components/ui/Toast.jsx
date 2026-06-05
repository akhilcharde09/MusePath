import { useStore } from '../../store/useStore'
import { X } from 'lucide-react'

const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' }

export default function Toast() {
  const { toasts, removeToast } = useStore()

  return (
    <div className="toast-container">
      {toasts.map(({ id, message, type }) => (
        <div key={id} className={`toast toast-${type}`}>
          <span>{icons[type] || icons.info}</span>
          <span style={{ flex: 1 }}>{message}</span>
          <button
            onClick={() => removeToast(id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
