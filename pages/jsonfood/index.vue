<template>
  <div>
    <h1>商品清單</h1>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>ID</th>
          <th>商品名稱</th>
          <th>數量</th>
          <th>價格</th>
          <th>店家</th>
          <th>有效日期</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in foods" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.product }}</td>
          <td>{{ item.amount }}</td>
          <td>{{ item.price }}</td>
          <td>{{ item.shop }}</td>
          <td>{{ item.todate }}</td>
          <td>
            <button @click="startEdit(item)">編輯</button>
            <button @click="deleteItem(item.id)">刪除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <h2 v-if="editingItem">編輯商品 (ID: {{ editingItem.id }})</h2>
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

// 取得列表
async function fetchFoods() {
  const res = await fetch("/api/jsonfood");
  foods.value = await res.json();
}

onMounted(() => {
  fetchFoods();
});

function startEdit(item) {
  editingItem.value = item;
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
    // PATCH 更新，因為 PUT 需帶完整資料
    const res = await fetch("/api/jsonfood", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
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
    // POST 新增
    const res = await fetch("/api/jsonfood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
    const data = await res.json();
    if (data.success) {
      alert("新增成功");
      await fetchFoods();
      form.value = {
        product: "",
        amount: 0,
        price: 0,
        shop: "",
        todate: "",
      };
    } else {
      alert("新增失敗：" + data.message);
    }
  }
}

async function deleteItem(id) {
  if (!confirm("確定要刪除 ID " + id + " 嗎？")) return;
  const res = await fetch(`/api/jsonfood?id=${id}`, { method: "DELETE" });
  const data = await res.json();
  if (data.success) {
    alert("刪除成功");
    await fetchFoods();
  } else {
    alert("刪除失敗：" + data.message);
  }
}
</script>
