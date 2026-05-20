import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TimeSlot } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateTimeSlots(startHour = 9, endHour = 17, intervalMinutes = 30): TimeSlot[] {
  const slots: TimeSlot[] = []
  const unavailableIndices = [1, 3, 6, 8, 11, 13]

  let index = 0
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      const period = hour < 12 ? 'AM' : 'PM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const displayMin = min === 0 ? '00' : String(min)
      slots.push({
        time: `${displayHour}:${displayMin} ${period}`,
        available: !unavailableIndices.includes(index),
      })
      index++
    }
  }
  return slots
}

export function generateRestaurantSlots(): TimeSlot[] {
  const times = [
    '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
    '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
  ]
  const unavailable = [2, 5, 8, 11]
  return times.map((time, i) => ({ time, available: !unavailable.includes(i) }))
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
