<template>
  <view class="container">
    <view class="card">
      <view class="flex-between">
        <text class="section-title text-bold">客户代码管理</text>
        <text class="text-primary text-sm" @click="openAddForm">添加客户代码</text>
      </view>

      <view v-for="cc in customerCodes" :key="cc.id" class="type-row">
        <template v-if="editingId === cc.id">
          <view class="edit-form">
            <view class="edit-row">
              <text class="edit-code">{{ cc.code }}</text>
              <picker :range="typeOptions" range-key="label" @change="(event: any) => editForm.type = typeOptions[event.detail.value]?.value ?? null">
                <view class="form-input picker-value">{{ typeLabel(editForm.type) || '选择类型' }}</view>
              </picker>
            </view>
            <input v-model="editForm.name" placeholder="客户名称（如：混合）" class="form-input mt-sm" />
            <view class="edit-actions mt-sm">
              <text class="text-secondary text-sm" @click="cancelEdit">取消</text>
              <text class="text-primary text-sm" @click="saveEdit(cc)">保存</text>
            </view>
          </view>
        </template>
        <template v-else>
          <view class="type-info">
            <text class="text-bold">{{ cc.code }}</text>
            <text class="type-meta">{{ cc.name || '未填名称' }} · {{ typeLabel(cc.type) || '未分类' }}</text>
          </view>
          <view class="row-actions">
            <text class="text-primary text-sm" @click="openEditForm(cc)">编辑</text>
            <text class="text-danger text-sm" @click="handleDelete(cc)">删除</text>
          </view>
        </template>
      </view>

      <view v-if="!customerCodes.length" class="text-center mt-lg text-secondary">
        <text>暂无客户代码</text>
      </view>
    </view>

    <!-- Add form -->
    <view v-if="showAddForm" class="card mt-md">
      <view class="flex-between">
        <text class="text-bold">添加客户代码</text>
        <text class="text-secondary text-sm" @click="showAddForm = false">取消</text>
      </view>
      <view class="form-group mt-md">
        <text class="form-label">客户代码 *</text>
        <input v-model="formData.code" placeholder="如: HIC" class="form-input" focus />
      </view>
      <view class="form-group mt-md">
        <text class="form-label">客户名称</text>
        <input v-model="formData.name" placeholder="如: 混合" class="form-input" />
      </view>
      <view class="form-group mt-md">
        <text class="form-label">客户类型</text>
        <picker :range="typeOptions" range-key="label" @change="(event: any) => formData.type = typeOptions[event.detail.value]?.value ?? ''">
          <view class="form-input picker-value">{{ typeLabel(formData.type) || '选择类型（所内/所外）' }}</view>
        </picker>
      </view>
      <button class="btn-primary mt-lg" :loading="saving" @click="submitForm">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { settingsApi } from "../../api/modules";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "../../utils/constants";
import type { CustomerCode } from "../../types";

const customerCodes = ref<CustomerCode[]>([]);
const showAddForm = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const editForm = ref({ name: "", type: "" as string | null });
const formData = ref({ code: "", name: "", type: "" });
const typeOptions = [{ label: "未分类", value: "" }, ...CUSTOMER_TYPES];

function typeLabel(type: string | null | undefined): string {
  return type ? CUSTOMER_TYPE_LABELS[type] || "" : "";
}

async function loadCustomerCodes() {
  try {
    customerCodes.value = await settingsApi.listCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function openAddForm() {
  formData.value = { code: "", name: "", type: "" };
  showAddForm.value = true;
}

function openEditForm(cc: CustomerCode) {
  editingId.value = cc.id;
  editForm.value = { name: cc.name || "", type: cc.type || "" };
}

function cancelEdit() {
  editingId.value = null;
}

async function submitForm() {
  if (!formData.value.code.trim()) {
    uni.showToast({ title: "请填写客户代码", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await settingsApi.createCustomerCode({
      code: formData.value.code.trim(),
      name: formData.value.name.trim() || undefined,
      type: formData.value.type || undefined,
    });
    uni.showToast({ title: "添加成功", icon: "success" });
    showAddForm.value = false;
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function saveEdit(cc: CustomerCode) {
  try {
    await settingsApi.updateCustomerCode(cc.id, {
      name: editForm.value.name.trim(),
      type: editForm.value.type || null,
    });
    uni.showToast({ title: "保存成功", icon: "success" });
    editingId.value = null;
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function handleDelete(cc: CustomerCode) {
  const res = await uni.showModal({
    title: "确认删除",
    content: `确定要删除客户代码"${cc.code}"吗？`,
  });
  if (res.cancel) return;

  try {
    await settingsApi.deleteCustomerCode(cc.id);
    uni.showToast({ title: "删除成功", icon: "success" });
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadCustomerCodes);
</script>

<style scoped lang="scss">
.section-title { font-size: 32rpx; }
.type-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #edf0f0;
  &:last-child { border-bottom: none; }
}
.type-info { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.type-meta { margin-top: 4rpx; color: #7d898b; font-size: 22rpx; }
.row-actions { display: flex; flex-shrink: 0; gap: 28rpx; }
.edit-form { width: 100%; }
.edit-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.edit-code { flex-shrink: 0; font-weight: 700; }
.edit-actions { display: flex; justify-content: flex-end; gap: 28rpx; }
.form-group { display: flex; flex-direction: column; gap: 8rpx; }
.form-label { font-size: 26rpx; color: #485458; font-weight: 600; }
.form-input {
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  min-height: 48rpx;
  background: #f5f7f7;
}
.picker-value { color: #172327; }
.btn-primary {
  background: #087f8c;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  text-align: center;
  min-height: 88rpx;
}
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
