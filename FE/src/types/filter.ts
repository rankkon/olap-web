export interface SelectOption {
  label: string
  value: string
}

export interface FilterState {
  time: string[]
  city: string[]
  store: string[]
  product: string[]
  customer: string[]
}

export type FilterKey = keyof FilterState
