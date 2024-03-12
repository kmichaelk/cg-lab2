import { CachedTomogram, Tomogram } from './types'
import { clamp } from './utils'

export const cacheTomogramColors = (tomogram: CachedTomogram, min: number, max: number) => {
  for (let i = 0; i < tomogram.data.length; i++) {
    tomogram.cache[i] = clamp(((tomogram.data[i] - min) * 255) / (max - min), 0, 255)
  }
}

export const createCachedTomogram = (tomogram: Tomogram) => ({
  ...tomogram,
  cache: new Int16Array(tomogram.data.length)
})
