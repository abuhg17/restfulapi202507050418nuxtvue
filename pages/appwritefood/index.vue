<template>
  <div>
    <h1>商品清單</h1>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>商品名稱</th>
          <th>數量</th>
          <th>價格</th>
          <th>店家</th>
          <th>有效日期</th>
          <th>操作</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        <!-- [修改 1] 改用 item.$id 作為 key 和顯示 -->
        <tr v-for="item in foods" :key="item.$id">
          <td>{{ item.product }}</td>
          <td>{{ item.amount }}</td>
          <td>{{ item.price }}</td>
          <td>{{ item.shop }}</td>
          <td>{{ item.todate.slice(0, 10) }}</td>
          <td>{{ item.$id.slice(-5) }}</td>
          <td>
            <button @click="startEdit(item)">編輯</button>
            <!-- [修改 2] 傳遞 item.$id 給刪除函式 -->
            <button @click="deleteItem(item.$id)">刪除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- [修改 3] 顯示 editingItem.$id -->
    <h2 v-if="editingItem">編輯商品 (ID: {{ editingItem.$id }})</h2>
    <h2 v-else>新增商品</h2>
    <form @submit.prevent="submitForm">
      <div>
        <label>商品名稱: </label>
        <!-- 在編輯模式下，商品名稱通常是關鍵欄位，不建議修改，所以 disabled 邏輯保留 -->
        <input v-model="form.product" :disabled="!!editingItem" required />
      </div>
      <div>
        <label>數量: </label>
        <input type="number" v-model.number="form.amount" required />
      </div>
      <div>
        <label>價格: </label>
        <input type="number" v-model.number="form.price" required />
      </div>
      <div>
        <label>店家: </label>
        <input v-model="form.shop" required />
      </div>
      <div>
        <label>有效日期: </label>
        <input type="date" v-model="form.todate" required />
      </div>
      <button type="submit">{{ editingItem ? "更新" : "新增" }}</button>
      <button type="button" @click="cancelEdit" v-if="editingItem">取消</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const foods = ref([]);
const editingItem = ref(null);
const form = ref({
  product: "",
  amount: 0,
  price: 0,
  shop: "",
  todate: "",
});

// 取得列表 (無需修改)
async function fetchFoods() {
  try {
    const res = await fetch("/api/appwritefood");
    if (!res.ok) throw new Error("無法取得資料");
    foods.value = await res.json();
  } catch (error) {
    console.error("Fetch foods error:", error);
    alert("載入商品清單失敗！");
  }
}

onMounted(() => {
  fetchFoods();
});

function startEdit(item) {
  editingItem.value = item;
  // 使用 item.$id 而非 item.id
  form.value = { ...item };
}

function cancelEdit() {
  editingItem.value = null;
  form.value = {
    product: "",
    amount: 0,
    price: 0,
    shop: "",
    todate: "",
  };
}

async function submitForm() {
  if (editingItem.value) {
    // --- 更新 (PATCH) ---
    // [修改 4] 將 id 放在 URL query 中，並從 editingItem.value.$id 取得
    const documentId = editingItem.value.$id;

    // 從 form.value 中移除 Appwrite 的系統欄位，只傳送要更新的資料
    const {
      $id,
      $collectionId,
      $databaseId,
      $createdAt,
      $updatedAt,
      $permissions,
      ...updateData
    } = form.value;

    const res = await fetch(`/api/appwritefood?id=${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData), // body 中不應包含 id
    });
    const data = await res.json();
    if (data.success) {
      alert("更新成功");
      await fetchFoods();
      cancelEdit();
    } else {
      alert("更新失敗：" + data.message);
    }
  } else {
    // --- 新增 (POST) --- (無需修改)
    const res = await fetch("/api/appwritefood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
    const data = await res.json();
    if (data.success) {
      alert("新增成功");
      await fetchFoods();
      cancelEdit(); // 使用 cancelEdit 重置表單更一致
    } else {
      alert("新增失敗：" + data.message);
    }
  }
}

async function deleteItem(id) {
  if (!confirm(`確定要刪除 ID ${id} 嗎？`)) return;
  // [修改 5] API URL 應為 /api/appwritefood
  const res = await fetch(`/api/appwritefood?id=${id}`, { method: "DELETE" });
  const data = await res.json();
  if (data.success) {
    alert("刪除成功");
    await fetchFoods();
  } else {
    alert("刪除失敗：" + data.message);
  }
}
</script>
