import React from "react"
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
  errorMessage
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
        <h2 className="text-xl font-semibold mb-4">Access TouchGate</h2>
        {errorMessage && (
          <p className="text-red-600 mb-2">{errorMessage}</p>
        )}
        <TouchGateInput onSubmit={onUnlock} />
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
