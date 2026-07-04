export const money = (value: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)

export const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1))
}
