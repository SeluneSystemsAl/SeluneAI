import React, { useState } from "react"

interface TouchGateInputProps {
  onSubmit: (gateKey: string) => void
}

export const TouchGateInput: React.FC<TouchGateInputProps> = ({ onSubmit }) => {
  const [key, setKey] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(key.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 items-center">
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Enter Gate Key"
        className="flex-1 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
      >
        Unlock
      </button>
    </form>
  )
}
