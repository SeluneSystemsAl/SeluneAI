import React from "react"
import { CheckCircle, XCircle } from "lucide-react"

interface TouchGateStatusProps {
  status: "locked" | "unlocked" | "error"
}

export const TouchGateStatus: React.FC<TouchGateStatusProps> = ({ status }) => {
  const config = {
    locked: { icon: XCircle, text: "Locked", color: "text-red-500" },
    unlocked: { icon: CheckCircle, text: "Unlocked", color: "text-green-500" },
    error: { icon: XCircle, text: "Error", color: "text-yellow-500" }
  } as const

  const { icon: Icon, text, color } = config[status]

  return (
    <div className={`flex items-center space-x-2`}>
      <Icon className={`${color} w-6 h-6`} />
      <span className={`font-medium ${color}`}>{text}</span>
    </div>
  )
}
