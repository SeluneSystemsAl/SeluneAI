import React from "react"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface TouchGateStatusProps {
  status: "locked" | "unlocked" | "error"
}

export const TouchGateStatus: React.FC<TouchGateStatusProps> = ({ status }) => {
  const config = {
    locked: { icon: XCircle, text: "Locked", color: "text-red-500", bg: "bg-red-50" },
    unlocked: { icon: CheckCircle, text: "Unlocked", color: "text-green-500", bg: "bg-green-50" },
    error: { icon: AlertTriangle, text: "Error", color: "text-yellow-600", bg: "bg-yellow-50" }
  } as const

  const { icon: Icon, text, color, bg } = config[status]

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${bg}`}>
      <Icon className={`${color} w-5 h-5`} />
      <span className={`font-semibold ${color}`}>{text}</span>
    </div>
  )
}
