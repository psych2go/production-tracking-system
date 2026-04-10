<template>
  <view class="container">
    <view class="card">
      <text class="section-title text-bold">新建批次</text>

      <view class="form-group mt-lg">
        <text class="form-label">批号 *</text>
        <input v-model="form.batchNo" placeholder="请输入批号" class="form-input" />
      </view>

      <view class="form-group mt-md">
        <text class="form-label">产品 *</text>
        <picker :range="products" range-key="model" @change="onProductChange">
          <view class="form-input picker-value">{{ selectedProductName || '请选择产品' }}</view>
        </picker>
      </view>

      <view class="form-group mt-md">
        <text class="form-label">加工数量 *</text>
        <input v-model="form.quantity" type="number" placeholder="请输入数量" class="form-input" />
      </view>

      <view class="form-group mt-md">
        <text class="form-label">优先级</text>
        <picker :range="priorities" range-key="label" @change="onPriorityChange">
          <view class="form-input picker-value">{{ selectedPriorityLabel || '普通' }}</view>
        </picker>
      </view>

      <view class="form-group mt-md">
        <text class="form-label">备注</text>
        <textarea v-model="form.notes" placeholder="备注信息（可选）" class="form-textarea" />
      </view>

      <button class="btn-primary mt-lg" :loading="submitting" @click="submit">创建批次</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { productApi, batchApi } from "../../api/modules";
import type { Product } from "../../types";

const products = ref<Product[]>([]);
const submitting = ref(false);

const priorities = [
  { label: "紧急", value: "urgent" },
  { label: "高", value: "high" },
  { label: "普通", value: "normal" },
  { label: "低", value: "low" },
];

const form = ref({
  batchNo: "",
  productId: 0,
  quantity: "",
  priority: "normal",
  notes: "",
});

const selectedProductName = computed(() => {
  return products.value.find((p) => p.id === form.value.productId)?.model || "";
});

const selectedPriorityLabel = computed(() => {
  return priorities.find((p) => p.value === form.value.priority)?.label || "";
});

function onProductChange(e: any) {
  form.value.productId = products.value[e.detail.value]?.id ?? 0;
}

function onPriorityChange(e: any) {
  form.value.priority = priorities[e.detail.value]?.value ?? "normal";
}

async function submit() {
  if (!form.value.batchNo || !form.value.productId || !form.value.quantity) {
    uni.showToast({ title: "请填写必填项", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    await batchApi.create({
      batchNo: form.value.batchNo,
      productId: form.value.productId,
      quantity: Number(form.value.quantity),
      priority: form.value.priority,
      notes: form.value.notes || undefined,
    });
    uni.showToast({ title: "创建成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    const res = await productApi.list();
    products.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});
</script>

<style scoped lang="scss">
.section-title { font-size: 32rpx; }
.form-group { display: flex; flex-direction: column; gap: 8rpx; }
.form-label { font-size: 26rpx; color: #666; }
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}
.form-textarea {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  height: 160rpx;
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
}
</style>
