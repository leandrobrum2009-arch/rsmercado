import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEffect, useState } from 'react'

export function BirthDatePicker({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) {
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-')
      setDay(parseInt(d).toString())
      setMonth(parseInt(m).toString())
      setYear(y)
    }
  }, [value])

  const handleDateChange = (d: string, m: string, y: string) => {
    if (d && m && y) {
      const formattedMonth = m.padStart(2, '0')
      const formattedDay = d.padStart(2, '0')
      onChange(`${y}-${formattedMonth}-${formattedDay}`)
    }
  }

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString())
  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString())

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <Select value={day} onValueChange={(val) => { setDay(val); handleDateChange(val, month, year); }}>
        <SelectTrigger className="h-12 border-zinc-200">
          <SelectValue placeholder="Dia" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {days.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={(val) => { setMonth(val); handleDateChange(day, val, year); }}>
        <SelectTrigger className="h-12 border-zinc-200">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {months.map(m => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={(val) => { setYear(val); handleDateChange(day, month, val); }}>
        <SelectTrigger className="h-12 border-zinc-200">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {years.map(y => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}