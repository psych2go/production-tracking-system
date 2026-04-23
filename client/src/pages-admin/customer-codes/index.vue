<template>
  <view class="container">
    <view class="card">
      <view class="flex-between">
        <text class="section-title text-bold">客户代码管理</text>
        <text class="text-primary text-sm" @click="showAddForm = true">添加客户代码</text>
      </view>

      <view v-for="cc in customerCodes" :key="cc.id" class="type-row">
        <text class="text-bold">{{ cc.code }}</text>
        <text class="text-danger text-sm" @click="handleDelete(cc)">删除</text>
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
      <button class="btn-primary mt-lg" :loading="saving" @click="submitForm">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { settingsApi } from "../../api/modules";
import type { CustomerCode } from "../../types";

const customerCodes = ref<CustomerCode[]>([]);
const showAddForm = ref(false);
const saving = ref(false);

const formData = ref({ code: "" });

async function loadCustomerCodes() {
  try {
    customerCodes.value = await settingsApi.listCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function submitForm() {
  if (!formData.value.code.trim()) {
    uni.showToast({ title: "请填写客户代码", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await settingsApi.createCustomerCode({ code: formData.value.code.trim() });
    uni.showToast({ title: "添加成功", icon: "success" });
    formData.value = { code: "" };
    showAddForm.value = false;
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    saving.value = false;
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
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.form-group { display: flex; flex-direction: column; gap: 8rpx; }
.form-label { font-size: 26rpx; color: #666; }
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  min-height: 48rpx;
}
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
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
