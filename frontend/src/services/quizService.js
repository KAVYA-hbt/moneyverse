import { getApiBaseUrl } from '../utils/apiBase.js'

/**
 * Sends persona details and request type to Python FastAPI + Groq backend
 */
export async function generateQuizFromBackend({
  requestType,       // 'MAIN_QUEST' | 'ROAD_TREASURE' | 'HINT_SCROLL'
  userProfile,       // { email, name, scenario, state, district }
  questContext = {},
  performanceState = {}
}) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/agent/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_type: requestType,
        user_profile: {
          email: userProfile?.email || 'kavya@example.com',
          name: userProfile?.name || 'Kavya',
          scenario: userProfile?.scenario || 'student',
          state: userProfile?.state || 'Tamil Nadu',
          district: userProfile?.district || 'Chennai',
          language: userProfile?.language || 'en',
        },
        quest_context: questContext,
        performance_state: performanceState
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.warn('Backend call failed, using fallback quiz state:', error)
    return null
  }
}