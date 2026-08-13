import QuestBanner from './QuestBanner.jsx'

export default function QuestBuildingBanners({ questState }) {
  const { chain, questBuildings, questLabels, isComplete, isLocked } = questState

  console.log('Quest buildings:', questBuildings, 'Chain:', chain)

  return chain.map((questId) => {
    const building = questBuildings[questId]
    if (!building) return null

    const status = isComplete(questId) ? 'complete' : isLocked(questId) ? 'locked' : 'available'

    return (
      <QuestBanner
        key={questId}
        building={building}
        label={questLabels[questId]}
        status={status}
      />
    )
  })
}






