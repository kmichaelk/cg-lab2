import { Tomogram, readTomogram } from './data'
import {
  QuadStripRenderer,
  QuadsRenderer,
  RendererConfiguration,
  TextureRenderer,
  createRenderingContext
} from './renderer'
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
  <div>
    <label for="renderer">Рендерер: </label>
    <select id="renderer" name="renderer"></select>
  </div>
  <span id="status">Загрузка...</span>
`
const renderers = [
  { name: 'Quads (Triangles)', initializer: QuadsRenderer },
  { name: 'Quad Strip (Triangle Strip)', initializer: QuadStripRenderer },
  { name: 'Texture', initializer: TextureRenderer },
]

const layerInput = document.querySelector<HTMLInputElement>('#layer')!
const tfMinInput = document.querySelector<HTMLInputElement>('#tf-min')!
const tfWidthInput = document.querySelector<HTMLInputElement>('#tf-width')!
const rendererSelect = document.querySelector<HTMLSelectElement>('#renderer')!

rendererSelect.innerHTML = renderers.map((el, idx) => `<option value="${idx}">${el.name}</option>`)
  .join('')

const statusLabel = document.querySelector<HTMLSpanElement>('#status')!
const updateStatus = () => {
  statusLabel.innerHTML = `<b>Слой:</b> ${layerInput.value} | <b>TF Min:</b> ${tfMinInput.value} | <b>TF Width:</b> ${tfWidthInput.value}`
}

//

let tomogram: Tomogram | null = null
const context = createRenderingContext(document.querySelector<HTMLCanvasElement>('#rendition')!)
const config: RendererConfiguration = {
  layer: parseInt(layerInput.value),

  transferFunctionMin: parseInt(tfMinInput.value),
  transferFunctionWidth: parseInt(tfWidthInput.value)
}

const changeRenderer = () => context.setRenderer(renderers[parseInt(rendererSelect.value)].initializer)
changeRenderer()

const renderTomogram = () => {
  updateStatus()

  context.configure(tomogram!, config)

  context.clear()
  context.render()
  context.flush()
}

const loadTomogram = (buf: ArrayBuffer) => {
  tomogram = readTomogram(buf)

  layerInput.disabled = false
  layerInput.max = (tomogram.size.z - 1).toString()

  renderTomogram()
}

const updateAndRender = () => {
  config.layer = parseInt(layerInput.value)
  config.transferFunctionMin = parseInt(tfMinInput.value)
  config.transferFunctionWidth = parseInt(tfWidthInput.value)

  renderTomogram()
}

const debouncedUpdateAndRender = debounce(updateAndRender, 5)
layerInput.addEventListener('input', (e) => debouncedUpdateAndRender())
;[tfMinInput, tfWidthInput].forEach((el) => el.addEventListener('input', (e) => debouncedUpdateAndRender()))

rendererSelect.addEventListener('change', (e) => {
  changeRenderer()
  renderTomogram()
})

fetch('sample.bin')
  .then((res) => res.arrayBuffer())
  .then((buf) => loadTomogram(buf))
