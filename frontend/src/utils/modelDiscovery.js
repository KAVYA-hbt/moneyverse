const MODEL_FILES = [
  'appartment.glb', 'atm.glb', 'bank.glb', 'bankbranch.glb', 'bar.glb',
  'bike-model.glb', 'brown.glb', 'building.glb', 'car-model.glb',
  'car-model2.glb', 'farmhouse.glb', 'hospital-building.glb',
  'house-big.glb', 'large-building.glb', 'lb.glb', 'lt.glb', 'office.glb',
  'red-building.glb', 'road .glb', 'sbi.glb', 'shop.glb', 'taxi.glb',
  'town-house.glb', 'traffic-light.glb',
]

import { cdnUrl } from '../config/assetCdn.js'

export function getDiscoveredModels() {
  return MODEL_FILES.map((filename) => {
    const name = filename.replace('.glb', '')
    return { name, url: cdnUrl(`models/${filename}`) }
  })
}