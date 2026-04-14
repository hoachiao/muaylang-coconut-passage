import useVocabularies from "./useVocabularies"
import Scene from "./Scene"

export default function VocabularySceneWrapper() {
  // 目前不指定 userId，先讀取最近的公共 / 全部 vocab
  const { data, loading, error } = useVocabularies()

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    console.error("Error loading vocabularies", error)
    return <div>Error loading vocabularies</div>
  }


  return (
    <div >
      <Scene vocabularies={data} />
    </div>
  )
}

