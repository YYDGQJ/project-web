export type CommonCardFieldType =
  | 'input'
  | 'inputnumber'
  | 'select'
  | 'date'
  | 'datetimerange'
  | 'textarea'
  | 'switch'

export interface CommonCardFieldConfig {
  type: CommonCardFieldType
  model: string
  placeholder?: string
  enabled?: boolean
  label?: string
  // select
  options?: Array<{ label: string; value: any }>
  multi?: boolean // select 多选
  // textarea
  rows?: number
}