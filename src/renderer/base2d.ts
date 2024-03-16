import { Tomogram } from '../data/types'
import { Renderer, RendererConfiguration, RendererConfigurationProperty } from './types'

interface Base2DRendererState {
  tomogram: Tomogram
  config: RendererConfiguration
  cache: Int16Array
}

export const Base2DRenderer = ({ render, changeTriggersCacheUpdate, updateCache, dispose }: {
  render: (state: Base2DRendererState) => void
  changeTriggersCacheUpdate: RendererConfigurationProperty[],
  updateCache: (state: Base2DRendererState) => void
  dispose: () => void
}): Renderer => {
  let state: Base2DRendererState | null = null

  return {
    render() {
      render(state!)
    },
    configure(tomogram, config) {
      let shouldUpdateCache = false

      if (state == null) {
        state = {
          tomogram,
          config: structuredClone(config),
          cache: new Int16Array(tomogram.data.length)
        }
        shouldUpdateCache = true
      } else {
        if (tomogram != state.tomogram) {
          if (state.cache.length != tomogram.data.length) {
            state.cache = new Int16Array(tomogram.data.length)
          }
          state.tomogram = tomogram
          shouldUpdateCache = true
        }

        ;(Object.keys(config) as RendererConfigurationProperty[]).forEach((key) => {
          if (state!.config[key] != config[key] && changeTriggersCacheUpdate.includes(key)) {
            shouldUpdateCache = true
          }
          state!.config[key] = config[key]
        })
      }

      if (shouldUpdateCache) {
        updateCache(state!)
      }
    },
    dispose() {
      dispose()
    }
  }
}
