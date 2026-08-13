import { getApiBaseUrl } from '../utils/apiBase.js'

function apiBase() {
  return `${getApiBaseUrl()}/api/player`
}

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('Backend sync call failed:', err)
    return null
  }
}

export async function syncPlayer({ email, name, scenario, state, district, avatarName }) {
  return safeFetch(`${apiBase()}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, scenario, state, district, avatar_name: avatarName }),
  })
}

export async function completeQuestOnServer(email, questId, rewardCoins) {
  return safeFetch(`${apiBase()}/${encodeURIComponent(email)}/complete-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quest_id: questId, reward_coins: rewardCoins }),
  })
}

export async function collectTreasureOnServer(email, treasureId, rewardType, bonusCoins) {
  return safeFetch(`${apiBase()}/${encodeURIComponent(email)}/collect-treasure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ treasure_id: treasureId, reward_type: rewardType, bonus_coins: bonusCoins }),
  })
}