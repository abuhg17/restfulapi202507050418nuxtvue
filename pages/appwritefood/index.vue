<template>
  <div>
    <h1>商品清單</h1>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th
            :class="{ active: sortKey === 'product' }"
            @click="sortBy('product')"
          >
            商品名稱
            {{ sortKey === "product" ? (sortOrder === "asc" ? "▲" : "▼") : "" }}
          </th>
          <th
            :class="{ active: sortKey === 'amount' }"
            @click="sortBy('amount')"
          >
            數量
            {{ sortKey === "amount" ? (sortOrder === "asc" ? "▲" : "▼") : "" }}
          </th>
          <th :class="{ active: sortKey === 'price' }" @click="sortBy('price')">
            價格
            {{ sortKey === "price" ? (sortOrder === "asc" ? "▲" : "▼") : "" }}
          </th>
          <th :class="{ active: sortKey === 'shop' }" @click="sortBy('shop')">
            店家
            {{ sortKey === "shop" ? (sortOrder === "asc" ? "▲" : "▼") : "" }}
          </th>
          <th
            :class="{ active: sortKey === 'todate' }"
            @click="sortBy('todate')"
          >
            有效日期
            {{ sortKey === "todate" ? (sortOrder === "asc" ? "▲" : "▼") : "" }}
          </th>
          <th>操作</th>
          <th :class="{ active: sortKey === '$id' }" @click="sortBy('$id')">
            ID {{ sortKey === "$id" ? (sortOrder === "asc" ? "▲" : "▼") : "" }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedFoods" :key="item.$id">
          <td>{{ item.product }}</td>
          <td>{{ item.amount }}</td>
          <td>{{ item.price }}</td>
          <td>{{ item.shop }}</td>
          <td>{{ formatDate(item.todate) }}</td>
          <td>
            <button @click="startEdit(item)">編輯</button>
            <button @click="deleteItem(item.$id)">刪除</button>
          </td>
          <td>{{ item.$id.slice(-5) }}</td>
        </tr>
      </tbody>
    </table>

    <h2 v-if="editingItem">編輯商品 (ID: {{ editingItem.$id }})</h2>
    <h2 v-else>新增商品</h2>
    <form @submit.prevent="submitForm">
      <div>
        <label>商品名稱: </label>
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
import { ref, onMounted, computed } from "vue";

// 狀態
const foods = ref([]);
const editingItem = ref(null);
const form = ref({
  product: "",
  amount: 0,
  price: 0,
  shop: "",
  todate: "",
});

// 排序狀態
const sortKey = ref("product");
const sortOrder = ref("asc");

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

// 排序後的 foods
const sortedFoods = computed(() => {
  return [...foods.value].sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];

    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder.value === "asc" ? valA - valB : valB - valA;
    }

    return sortOrder.value === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });
});

// 日期格式化
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 取得資料
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

// 編輯流程
function startEdit(item) {
  editingItem.value = item;
  form.value = {
    product: item.product,
    amount: item.amount,
    price: item.price,
    shop: item.shop,
    todate: item.todate,
  };
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

// 新增 / 更新
async function submitForm() {
  if (editingItem.value) {
    const documentId = editingItem.value.$id;
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
      body: JSON.stringify(updateData),
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
    const res = await fetch("/api/appwritefood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
    const data = await res.json();
    if (data.success) {
      alert("新增成功");
      await fetchFoods();
      cancelEdit();
    } else {
      alert("新增失敗：" + data.message);
    }
  }
}

// 刪除
async function deleteItem(id) {
  if (!confirm(`確定要刪除 ID ${id} 嗎？`)) return;
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

<style scoped>
th.active {
  background-color: #eef;
  color: #003366;
  font-weight: bold;
}
th {
  cursor: pointer;
}
th:hover {
  background-color: #f0f0f0;
}
</style>
