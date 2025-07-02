import { Client, Databases, ID, Query } from "node-appwrite";
import { getQuery, readBody } from "h3";

// 1. 初始化 Appwrite Client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // 例如 'https://cloud.appwrite.io/v1'
  .setProject(process.env.APPWRITE_PROJECT_ID) // 你的專案 ID
  .setKey(process.env.APPWRITE_API_KEY); // 你的 API 金鑰

const databases = new Databases(client);

// 從環境變數讀取你的資料庫和集合 ID
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_COLLECTION_ID;

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  if (method === "GET") {
    try {
      const queryParams = getQuery(event);
      const queries = [];

      // 建立查詢條件陣列
      // 注意：Appwrite 的查詢需要你在集合中為這些屬性建立索引 (index)
      if (queryParams.product) {
        queries.push(Query.equal("product", queryParams.product));
      }
      if (queryParams.amount) {
        queries.push(Query.equal("amount", Number(queryParams.amount)));
      }
      if (queryParams.price) {
        queries.push(Query.equal("price", Number(queryParams.price)));
      }
      if (queryParams.shop) {
        queries.push(Query.equal("shop", queryParams.shop));
      }
      if (queryParams.todate) {
        queries.push(Query.equal("todate", queryParams.todate));
      }

      const response = await databases.listDocuments(
        databaseId,
        collectionId,
        queries
      );

      // Appwrite 回傳的資料在 documents 屬性中
      return response.documents;
    } catch (err) {
      return { error: true, message: "讀取失敗", detail: err.message };
    }
  }

  if (method === "POST") {
    try {
      const newItem = await readBody(event);

      if (
        !newItem.product ||
        !newItem.amount ||
        !newItem.price ||
        !newItem.shop ||
        !newItem.todate
      ) {
        return { error: true, message: "欄位不完整" };
      }

      // Appwrite 的 createDocument 需要一個唯一的 ID，我們可以使用 ID.unique() 讓它自動產生
      const document = await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        newItem
      );

      return { success: true, item: document };
    } catch (err) {
      // 處理 Appwrite 可能的唯一鍵衝突錯誤
      if (err.code === 409) {
        return {
          error: true,
          message: `資料已存在，可能違反了唯一性約束`,
          detail: err.message,
        };
      }
      return { error: true, message: "寫入失敗", detail: err.message };
    }
  }

  // 在 Appwrite 中，PUT 和 PATCH 的行為相似，都使用 updateDocument
  if (method === "PUT" || method === "PATCH") {
    try {
      const updatedFields = await readBody(event);
      const documentId = getQuery(event).id; // 從 query 取得 id

      if (!documentId) {
        return { error: true, message: "必須在 URL query 中提供文件 id" };
      }

      const document = await databases.updateDocument(
        databaseId,
        collectionId,
        documentId,
        updatedFields // 傳遞要更新的欄位
      );

      return { success: true, item: document };
    } catch (err) {
      return { error: true, message: "更新失敗", detail: err.message };
    }
  }

  if (method === "DELETE") {
    try {
      const { id } = getQuery(event);

      if (!id) {
        return { error: true, message: "必須在 URL query 中提供 id" };
      }

      // Appwrite 的 deleteDocument 成功時不會回傳任何內容
      await databases.deleteDocument(databaseId, collectionId, id);

      return { success: true, message: `文件 ${id} 已刪除` };
    } catch (err) {
      return { error: true, message: "刪除失敗", detail: err.message };
    }
  }

  return { error: true, message: "僅支援 GET、POST、PUT、PATCH、DELETE 方法" };
});
