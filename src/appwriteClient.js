import { Client, Databases } from "appwrite"

// 使用 Vite 的環境變數（必須是 VITE_ 開頭才會被前端看到）
const endpoint =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://api.muaylang.app/v1"

const projectId =
  import.meta.env.VITE_APPWRITE_PROJECT_ID || "YOUR_PROJECT_ID_HERE"

// 共用 Appwrite client 設定
const client = new Client().setEndpoint(endpoint).setProject(projectId)

export const databases = new Databases(client)

// Database / Collection ID 可以從環境變數帶入，否則退回指定預設值
export const databaseId =
  import.meta.env.VITE_APPWRITE_DATABASE_ID || "687217840008e6de6bc1"

export const vocabulariesCollectId =
  import.meta.env.VITE_APPWRITE_VOCABULARIES_COLLECTION_ID ||
  "687217960026dea9e7f1"

