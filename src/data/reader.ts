import { Tomogram } from './types'

const littleEndian: boolean = true // sample.bin

export const readTomogram = (buf: ArrayBuffer): Tomogram => {
  const dataView = new DataView(buf)

  const x = dataView.getInt32(0, littleEndian)
  const y = dataView.getInt32(4, littleEndian)
  const z = dataView.getInt32(8, littleEndian)

  const data = new Int16Array(buf, 12, x * y * z)

  return {
    size: { x, y, z },
    data
  }
}
