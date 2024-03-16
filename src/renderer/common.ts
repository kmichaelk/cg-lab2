import { Tomogram } from '../data/types'
import { clamp } from '../utils'

export const transferTomogramColors = (tomogram: Tomogram, cache: Int16Array, min: number, max: number) => {
  for (let i = 0; i < tomogram.data.length; i++) {
    cache[i] = clamp(((tomogram.data[i] - min) * 255) / (max - min), 0, 255)
  }
}
