"use client"

import { useEffect, useState } from "react"

export function LoadingSpinner() {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative h-16 w-16">
        {/* Outer spinning circle */}
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>

        {/* Middle spinning circle (opposite direction) */}
        <div className="absolute inset-2 rounded-full border-4 border-r-primary border-l-transparent border-t-transparent border-b-transparent animate-spin-reverse"></div>

        {/* Inner pulsing circle */}
        <div className="absolute inset-4 rounded-full bg-primary/20 animate-pulse"></div>
      </div>

      <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
        Loading
        {/*<span className="inline-block w-6">{".".repeat(dots)}</span>*/}
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <LoadingSpinner />
    </div>
  )
}

