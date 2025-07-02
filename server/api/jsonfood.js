import { promises as fs } from "fs";
import { join } from "path";
import { getQuery } from "h3";

const filePath = join(process.cwd(), "json", "jsonfood.json");

export default defineEventHandler(async (event) => {
  // 讀取檔案 JSON 陣列
  async function readData() {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      // 檔案不存在或錯誤，回傳空陣列
      return [];
    }
  }

  // 寫入檔案 JSON 陣列
  async function writeData(data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  const method = event.req.method;

  if (method === "GET") {
    try {
      const foodArray = await readData();
      const query = getQuery(event);

      // 篩選資料
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

  if (event.method === "POST") {
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

      const data = await fs.readFile(filePath, "utf-8");
      const foodArray = JSON.parse(data);

      // 檢查 product 是否已存在
      const exists = foodArray.some((item) => item.product === newItem.product);
      if (exists) {
        return {
          error: true,
          message: `產品名稱 '${newItem.product}' 已存在，不能重複`,
        };
      }

      const maxId = foodArray.reduce(
        (max, item) => (item.id > max ? item.id : max),
        0
      );

      const itemToAdd = {
        id: maxId + 1,
        ...newItem,
      };

      foodArray.push(itemToAdd);

      await fs.writeFile(filePath, JSON.stringify(foodArray, null, 2), "utf-8");

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

      // PUT 一般是全部欄位都更新（但保留 id）
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

      // PATCH 部分更新，只更新提供的欄位，id 不可被改
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

      // 刪除該筆資料
      const deletedItem = foodArray.splice(index, 1)[0];
      await writeData(foodArray);

      return { success: true, item: deletedItem };
    } catch (err) {
      return { error: true, message: "刪除失敗", detail: err.message };
    }
  }

  return { error: true, message: "僅支援 GET、POST、PUT、PATCH、DELETE 方法" };
});
