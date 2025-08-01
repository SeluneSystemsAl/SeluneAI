import React, { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { TouchGateInput } from "./TouchGateInput"

interface TouchGateModalProps {
  isOpen: boolean
  onClose: () => void
  onUnlock: (gateKey: string) => void
  errorMessage?: string
}

export const TouchGateModal: React.FC<TouchGateModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
  errorMessage,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKey)
    }
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="touchgate-title"
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl p-6 w-96 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <h2 id="touchgate-title" className="text-xl font-semibold mb-4">
          Access TouchGate
        </h2>
        {errorMessage && (
          <p className="text-red-600 mb-2" role="alert">
            {errorMessage}
          </p>
        )}
        <TouchGateInput onSubmit={onUnlock} />
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:underline focus:outline-none"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}
