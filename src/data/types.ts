export interface Dimension {
  x: number
  y: number
  z: number
}

export interface Tomogram {
  readonly size: Dimension
  readonly data: Int16Array
}