'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'

const WA_URL =
  'https://wa.me/221784858226?text=Bonjour%20SmarticketS%2C%20je%20souhaite%20en%20savoir%20plus'

export default function WhatsAppFloat() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter SmarticketS sur WhatsApp"
      className="fixed bottom-6 right-6 z-50 group"
    >
      {/* Ping animation ring */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />

      {/* Main button */}
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg shadow-green-500/30 hover:scale-110 transition-transform duration-200">
        <MessageCircle className="w-6 h-6 text-white" />
      </span>
    </a>
  )
}
