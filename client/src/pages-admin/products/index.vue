<template>
  <view class="container">
    <view class="card">
      <view class="flex-between mb-md">
        <text class="section-title text-bold">产品管理</text>
        <button class="btn-sm btn-primary" @click="startAdd">添加</button>
      </view>

      <!-- Add/Edit form -->
      <view v-if="showForm" class="add-form">
        <input v-model="formData.model" placeholder="型号" class="form-input" />
        <input v-model="formData.name" placeholder="名称（可选）" class="form-input mt-sm" />
        <view class="flex-between mt-sm">
          <button class="btn-sm" @click="cancelForm">取消</button>
          <button class="btn-sm btn-primary" @click="submitForm">
            {{ editingId ? '更新' : '保存' }}
          </button>
        </view>
      </view>

      <!-- Product list -->
      <view v-for="product in products" :key="product.id" class="product-item">
        <view>
          <text class="text-bold">{{ product.model }}</text>
          <text class="text-secondary text-sm ml-sm">{{ product.name || '' }}</text>
        </view>
        <view class="actions">
          <text class="action-link" @click="startEdit(product)">编辑</text>
          <text class="action-link text-danger" @click="deleteProduct(product)">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { productApi } from "../../api/modules";
import type { Product } from "../../types";

const products = ref<Product[]>([]);
const showForm = ref(false);
const editingId = ref<number | null>(null);
const formData = ref({ model: "", name: "" });

async function loadProducts() {
  try {
    const res = await productApi.list();
    products.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function startAdd() {
  editingId.value = null;
  formData.value = { model: "", name: "" };
  showForm.value = true;
}

function startEdit(product: Product) {
  editingId.value = product.id;
  formData.value = { model: product.model, name: product.name || "" };
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
  formData.value = { model: "", name: "" };
}

async function submitForm() {
  if (!formData.value.model) {
    uni.showToast({ title: "请输入型号", icon: "none" });
    return;
  }
  try {
    if (editingId.value) {
      await productApi.update(editingId.value, formData.value);
      uni.showToast({ title: "更新成功", icon: "success" });
    } else {
      await productApi.create(formData.value);
      uni.showToast({ title: "添加成功", icon: "success" });
    }
    cancelForm();
    await loadProducts();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function deleteProduct(product: Product) {
  const res = await uni.showModal({
    title: "确认删除",
    content: `确定要删除产品 ${product.model} 吗？`,
  });
  if (res.cancel) return;
  try {
    await productApi.delete(product.id);
    await loadProducts();
    uni.showToast({ title: "已删除", icon: "success" });
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadProducts);
</script>

<style scoped lang="scss">
.section-title { font-size: 32rpx; }
.btn-sm {
  font-size: 26rpx;
  padding: 8rpx 24rpx;
  background: #f5f5f5;
  border: none;
  border-radius: 8rpx;
}
.btn-primary { background: #0083ff; color: #fff; }
.add-form {
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
}
.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.actions { display: flex; gap: 24rpx; }
.action-link {
  font-size: 26rpx;
  color: #0083ff;
}
.text-danger { color: #fa5151; }
</style>
