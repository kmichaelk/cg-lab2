import { readTomogram } from './reader'
import { createRenderer } from './renderer'
import { cacheTomogramColors, createCachedTomogram } from './tomogram'
import { CachedTomogram } from './types'
import './styles/main.css'
import debounce from './utils'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="text-align: center">
    <h2 style="margin: 2px">Лабораторная работа №2</h2>
    <h3 style="margin: 2px">Визуализация томограмм</h3>
  </div>
  <div class="canvas-wrapper">
    <canvas id="rendition" width="512" height="512"></canvas>
  </div>
  <div style="width: 100%">
    <input id="layer" type="range" min="0" value="0" disabled="true">
  </div>
  <div style="width: 100%; display: flex; flex-direction: row; gap: 8px; text-align: center">
    <div style="flex: 1">
      <input id="tf-min" type="range" min="0" max="255" value="0">
      Минимум
    </div>
    <div style="flex: 1">
      <input id="tf-width" type="range" min="1" max="255" value="1">
      Ширина
    </div>
  </div>
  <span id="status">Загрузка...</span>
`

let tomogram: CachedTomogram | null = null
const renderer = createRenderer(document.querySelector<HTMLCanvasElement>('#rendition')!)

const layerInput = document.querySelector<HTMLInputElement>('#layer')!
const getSelectedLayer = () => parseInt(layerInput.value)

const tfMinInput = document.querySelector<HTMLInputElement>('#tf-min')!
const tfWidthInput = document.querySelector<HTMLInputElement>('#tf-width')!
const getTransformFunctionMax = () => parseInt(tfMinInput.value) + parseInt(tfWidthInput.value)

const statusLabel = document.querySelector<HTMLSpanElement>('#status')!
const updateStatus = () => {
  statusLabel.innerHTML = `<b>Слой:</b> ${getSelectedLayer()} | <b>TF:</b> ${getTransformFunctionMax()}`
}

const renderTomogram = () => {
  updateStatus()

  renderer.clearView()
  renderer.drawQuads(tomogram!, getSelectedLayer())
  renderer.flush()
}

const loadTomogram = (buf: ArrayBuffer) => {
  tomogram = createCachedTomogram(readTomogram(buf))
  cacheTomogramColors(tomogram, 0, getTransformFunctionMax())

  layerInput.disabled = false
  layerInput.max = (tomogram.size.z - 1).toString()

  renderTomogram()
}

const debouncedRenderTomogram = debounce(renderTomogram, 5)
layerInput.addEventListener('input', (e) => {
  debouncedRenderTomogram()
})

const retransferColorsAndRender = () => {
  cacheTomogramColors(tomogram!, 0, getTransformFunctionMax())
  renderTomogram()
}
const debouncedRetransferColorsAndRender = debounce(retransferColorsAndRender, 5)
;[tfMinInput, tfWidthInput].forEach((el) => el.addEventListener('input', (e) => debouncedRetransferColorsAndRender()))

fetch('sample.bin')
  .then((res) => res.arrayBuffer())
  .then((buf) => loadTomogram(buf))
