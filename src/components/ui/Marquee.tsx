import React from 'react'

const items = [
  'Barbershops', 'Restaurants', 'Real Estate', 'Dental Practices',
  'Fitness Studios', 'Construction', 'Auto Detailing', 'Cleaning Services',
  'Photographers', 'Law Firms', 'Salons', 'Consultants', 'E-Commerce',
  'Personal Brands', 'Medical Practices', 'Event Planners',
]

function Item({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-3 mx-6 text-sm font-medium text-gray-600 whitespace-nowrap">
      <span className="w-1 h-1 rounded-full bg-[#c9a84c] opacity-60 shrink-0" />
      {text}
    </span>
  )
}

export default function Marquee() {
  const doubled = [...items, ...items]

  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.015] py-4 select-none">
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />

      <div
        className="flex"
        style={{ animation: 'marquee 35s linear infinite' }}
      >
        {doubled.map((item, i) => (
          <Item key={i} text={item} />
        ))}
      </div>
    </div>
  )
}
