import { Storage } from "@google-cloud/storage";
import { getQuery, readBody } from "h3";

const storage = new Storage({
  // 如果在本地用金鑰檔，請設定 keyFilename 或用環境變數 GOOGLE_APPLICATION_CREDENTIALS
  // keyFilename: "./path-to-your-service-account.json",
});

const bucketName = "tsaopaofenghsiung2025";
const fileName = "jsonfood.json";

// 讀取 JSON 陣列
async function readData() {
  try {
    const [contents] = await storage
      .bucket(bucketName)
      .file(fileName)
      .download();
    return JSON.parse(contents.toString("utf-8"));
  } catch (err) {
    // 如果檔案不存在或格式錯誤，回傳空陣列
    return [];
  }
}

// 寫入 JSON 陣列
async function writeData(data) {
  try {
    const file = storage.bucket(bucketName).file(fileName);

    await file.save(JSON.stringify(data, null, 2), {
      contentType: "application/json",
    });

    await file.makePublic(); // 公開檔案
    console.log("jsonfood.json 更新並已設為公開");
  } catch (error) {
    console.error("寫入或公開失敗:", error);
  }
}

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  if (method === "GET") {
    try {
      const foodArray = await readData();
      const query = getQuery(event);

      const filtered = foodArray.filter((item) => {
        return (
          (!query.id || item.id === Number(query.id)) &&
          (!query.product || item.product === query.product) &&
          (!query.amount || item.amount === Number(query.amount)) &&
          (!query.price || item.price === Number(query.price)) &&
          (!query.shop || item.shop === query.shop) &&
          (!query.todate || item.todate === query.todate)
        );
      });

      return filtered;
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

      const foodArray = await readData();

      // 檢查 product 是否重複
      if (foodArray.some((item) => item.product === newItem.product)) {
        return {
          error: true,
          message: `產品名稱 '${newItem.product}' 已存在，不能重複`,
        };
      }

      const maxId = foodArray.reduce(
        (max, item) => (item.id > max ? item.id : max),
        0
      );
      const itemToAdd = { id: maxId + 1, ...newItem };

      foodArray.push(itemToAdd);
      await writeData(foodArray);

      return { success: true, item: itemToAdd };
    } catch (err) {
      return { error: true, message: "寫入失敗", detail: err.message };
    }
  }

  if (method === "PUT") {
    try {
      const updatedItem = await readBody(event);

      if (!updatedItem.id) {
        return { error: true, message: "必須包含 id 欄位" };
      }

      const foodArray = await readData();
      const index = foodArray.findIndex(
        (item) => item.id === Number(updatedItem.id)
      );

      if (index === -1) {
        return { error: true, message: "找不到對應的資料" };
      }

      // PUT 是整筆更新（保留 id）
      foodArray[index] = { id: foodArray[index].id, ...updatedItem };
      await writeData(foodArray);

      return { success: true, item: foodArray[index] };
    } catch (err) {
      return { error: true, message: "更新失敗", detail: err.message };
    }
  }

  if (method === "PATCH") {
    try {
      const updatedFields = await readBody(event);

      if (!updatedFields.id) {
        return { error: true, message: "必須包含 id 欄位" };
      }

      const foodArray = await readData();
      const index = foodArray.findIndex(
        (item) => item.id === Number(updatedFields.id)
      );

      if (index === -1) {
        return { error: true, message: "找不到對應的資料" };
      }

      // PATCH 部分更新，id 不可被改
      foodArray[index] = {
        ...foodArray[index],
        ...updatedFields,
        id: foodArray[index].id,
      };
      await writeData(foodArray);

      return { success: true, item: foodArray[index] };
    } catch (err) {
      return { error: true, message: "更新失敗", detail: err.message };
    }
  }

  if (method === "DELETE") {
    try {
      const query = getQuery(event);

      if (!query.id) {
        return { error: true, message: "必須提供 id" };
      }

      const foodArray = await readData();
      const index = foodArray.findIndex((item) => item.id === Number(query.id));

      if (index === -1) {
        return { error: true, message: "找不到對應的資料" };
      }

      const deletedItem = foodArray.splice(index, 1)[0];
      await writeData(foodArray);

      return { success: true, item: deletedItem };
    } catch (err) {
      return { error: true, message: "刪除失敗", detail: err.message };
    }
  }

  return { error: true, message: "僅支援 GET、POST、PUT、PATCH、DELETE 方法" };
});
