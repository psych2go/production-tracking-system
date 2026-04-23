<template>
  <view class="container">
    <view class="card">
      <view class="flex-between">
        <text class="section-title text-bold">封装形式管理</text>
        <text class="text-primary text-sm" @click="openAddForm">添加封装形式</text>
      </view>

      <!-- Grouped by category -->
      <view v-for="group in groupedTypes" :key="group.category" class="mt-md">
        <text class="category-label">{{ group.category }} 系列</text>
        <view v-for="pt in group.items" :key="pt.id" class="type-row">
          <view class="type-info">
            <text class="text-bold">{{ pt.name }}</text>
            <text class="text-secondary text-sm">{{ pt.sortOrder }}</text>
          </view>
          <view class="type-actions">
            <text class="text-primary text-sm" @click="openEditForm(pt)">编辑</text>
            <text class="text-danger text-sm" @click="handleDelete(pt)">删除</text>
          </view>
        </view>
      </view>

      <view v-if="!packageTypes.length" class="text-center mt-lg text-secondary">
        <text>暂无封装形式</text>
      </view>
    </view>

    <!-- Add/Edit form -->
    <view v-if="showForm" class="card mt-md">
      <view class="flex-between">
        <text class="text-bold">{{ editingId ? '编辑封装形式' : '添加封装形式' }}</text>
        <text class="text-secondary text-sm" @click="closeForm">取消</text>
      </view>
      <view class="form-group mt-md">
        <text class="form-label">封装名称 *</text>
        <input v-model="formData.name" placeholder="如: SOP8L" class="form-input" focus />
      </view>
      <view class="form-group mt-md">
        <text class="form-label">系列分类</text>
        <picker :range="CATEGORIES" @change="onCategoryChange">
          <view class="form-input picker-value">{{ formData.category || '请选择系列' }}</view>
        </picker>
      </view>
      <view class="form-group mt-md">
        <text class="form-label">排序号</text>
        <input v-model="formData.sortOrder" type="number" placeholder="数字越小越靠前" class="form-input" />
      </view>
      <button class="btn-primary mt-lg" :loading="saving" @click="submitForm">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { settingsApi } from "../../api/modules";
import type { PackageType } from "../../types";

const CATEGORIES = ["DIP", "SOP", "SSOP", "MSOP", "SOT", "LQFP", "QFN", "DFN", "其它"];

const packageTypes = ref<PackageType[]>([]);
const showForm = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

const formData = ref({
  name: "",
  category: "",
  sortOrder: "",
});

const groupedTypes = computed(() => {
  const map = new Map<string, PackageType[]>();
  for (const pt of packageTypes.value) {
    const list = map.get(pt.category) || [];
    list.push(pt);
    map.set(pt.category, list);
  }
  const result: { category: string; items: PackageType[] }[] = [];
  for (const [cat, items] of map) {
    result.push({ category: cat, items });
  }
  return result;
});

function onCategoryChange(e: any) {
  formData.value.category = CATEGORIES[e.detail.value] ?? "";
}

function openAddForm() {
  editingId.value = null;
  formData.value = { name: "", category: "", sortOrder: "" };
  showForm.value = true;
}

function openEditForm(pt: PackageType) {
  editingId.value = pt.id;
  formData.value = {
    name: pt.name,
    category: pt.category || "",
    sortOrder: pt.sortOrder != null ? String(pt.sortOrder) : "",
  };
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

async function loadPackageTypes() {
  try {
    packageTypes.value = await settingsApi.listPackageTypes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function submitForm() {
  if (!formData.value.name.trim()) {
    uni.showToast({ title: "请填写封装名称", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: formData.value.name.trim(),
      category: formData.value.category || undefined,
      sortOrder: formData.value.sortOrder ? Number(formData.value.sortOrder) : undefined,
    };
    if (editingId.value) {
      await settingsApi.updatePackageType(editingId.value, payload);
      uni.showToast({ title: "更新成功", icon: "success" });
    } else {
      await settingsApi.createPackageType(payload);
      uni.showToast({ title: "添加成功", icon: "success" });
    }
    closeForm();
    await loadPackageTypes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function handleDelete(pt: PackageType) {
  const res = await uni.showModal({
    title: "确认删除",
    content: `确定要删除封装形式"${pt.name}"吗？`,
  });
  if (res.cancel) return;

  try {
    await settingsApi.deletePackageType(pt.id);
    uni.showToast({ title: "删除成功", icon: "success" });
    await loadPackageTypes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadPackageTypes);
</script>

<style scoped lang="scss">
.category-label {
  display: block;
  font-size: 24rpx;
  color: #0083ff;
  background: #f0f7ff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}
.type-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.type-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.type-actions {
  display: flex;
  gap: 24rpx;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form-label { font-size: 26rpx; color: #666; }
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  min-height: 48rpx;
}
.picker-value { color: #333; }
.btn-primary {
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  text-align: center;
  min-height: 88rpx;
}
.section-title { font-size: 32rpx; }
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mt-md { margin-top: 24rpx; }
.mt-lg { margin-top: 40rpx; }
</style>
