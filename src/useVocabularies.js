import { useEffect, useState } from "react"
import { Query } from "appwrite"
import { databases, databaseId, vocabulariesCollectId } from "./appwriteClient"

/**
 * 每筆 vocabulary document 會包含至少：
 * - $id: Appwrite 產生的文件 ID
 * - thai: 泰文單字
 * - romanization: 泰文羅馬拼音
 * - english: 英文翻譯
 * - exampleTH: 泰文例句
 * - exampleEN: 英文例句
 * - tags: 字串陣列，例如 ["verb", "beginner"]
 * - userId: 建立這筆資料的使用者 ID
 */
export default function useVocabularies(userId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function fetchVocabularies() {
      setLoading(true)
      setError(null)

      try {
        const queries = [
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ]

        if (userId) {
          queries.push(Query.equal("userId", userId))
        }

        const res = await databases.listDocuments(
          databaseId,
          vocabulariesCollectId,
          queries
        )

        if (!mounted) return
        setData(res.documents || [])
      } catch (err) {
        if (!mounted) return
        console.error("Failed to fetch vocabularies:", err)
        setError(err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchVocabularies()

    return () => {
      mounted = false
    }
  }, [userId])

  return { data, loading, error }
}

