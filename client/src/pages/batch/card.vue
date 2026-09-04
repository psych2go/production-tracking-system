<template>
  <view class="container">
    <view v-if="loading" class="card loading-card"><text class="text-secondary">正在加载订单...</text></view>
    <view v-else-if="batch" class="card card-form">
      <view class="form-heading">
        <text class="section-title">制卡</text>
        <text class="form-subtitle">填写生产批号后生成待投产任务</text>
      </view>

      <view class="order-summary">
        <view class="summary-item summary-wide">
          <text class="summary-label">订单编号</text>
          <text class="summary-value">{{ batch.orderNo }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">产品型号</text>
          <text class="summary-value">{{ batch.product?.model }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">订单数量</text>
          <text class="summary-value">{{ batch.quantity }}只</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">客户代码</text>
          <text class="summary-value">{{ batch.customerCode }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">封装形式</text>
          <text class="summary-value">{{ batch.packageType }}</text>
        </view>
      </view>

      <view class="form-group mt-lg">
        <text class="form-label">生产批号 *</text>
        <input v-model="batchNo" maxlength="100" placeholder="请输入生产批号" class="form-input" focus />
      </view>

      <view class="form-group mt-md">
        <view class="form-label-row">
          <text class="form-label">生产预计交期</text>
          <text v-if="productionDelivery" class="clear-value" @click="productionDelivery = ''">清除</text>
        </view>
        <picker mode="date" :value="productionDelivery" @change="onProductionDeliveryChange">
          <view class="form-input picker-value" :class="{ placeholder: !productionDelivery }">
            {{ productionDelivery || '请选择日期（选填）' }}
          </view>
        </picker>
      </view>

      <view class="form-group mt-md">
        <text class="form-label">备注</text>
        <textarea v-model="notes" maxlength="2000" placeholder="备注信息（选填）" class="form-textarea" />
      </view>

      <button class="btn btn-primary btn-block mt-lg" :loading="submitting" @click="submit">确认制卡</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { batchApi } from "../../api/modules";
import type { Batch } from "../../types";

const batch = ref<Batch | null>(null);
const batchNo = ref("");
const productionDelivery = ref("");
const notes = ref("");
const loading = ref(true);
const submitting = ref(false);

function onProductionDeliveryChange(event: any) {
  productionDelivery.value = event.detail.value ?? "";
}

async function submit() {
  if (!batch.value || submitting.value) return;
  if (!batchNo.value.trim()) {
    uni.showToast({ title: "请输入生产批号", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    await batchApi.confirmCard(batch.value.id, {
      batchNo: batchNo.value.trim(),
      productionDelivery: productionDelivery.value || null,
      notes: notes.value.trim(),
    });
    uni.showToast({ title: "制卡成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 700);
  } catch (e: unknown) {
    uni.showModal({ title: "制卡失败", content: (e as Error).message, showCancel: false });
  } finally {
    submitting.value = false;
  }
}

onLoad(async (query) => {
  const id = Number(query?.id);
  if (!Number.isInteger(id) || id <= 0) {
    uni.showToast({ title: "订单参数无效", icon: "none" });
    loading.value = false;
    return;
  }
  try {
    batch.value = await batchApi.get(id);
    if (batch.value.status !== "pending_card") {
      uni.showToast({ title: "该订单已经完成制卡", icon: "none" });
    }
    productionDelivery.value = batch.value.productionDelivery?.slice(0, 10) || "";
    notes.value = batch.value.notes || "";
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
.loading-card { padding: 80rpx 24rpx; text-align: center; }
.card-form { border-top: 6rpx solid #d97706; }
.form-heading { display: flex; flex-direction: column; }
.form-subtitle { margin-top: 4rpx; color: #7d898b; font-size: 22rpx; }
.order-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 24rpx;
  overflow: hidden;
  border: 2rpx solid #edf0f0;
  border-radius: 9rpx;
  background: #edf0f0;
  gap: 2rpx;
}
.summary-item {
  display: flex;
  min-width: 0;
  padding: 13rpx 16rpx;
  flex-direction: column;
  background: #fff;
}
.summary-wide { grid-column: 1 / -1; }
.summary-label { color: #7d898b; font-size: 19rpx; }
.summary-value {
  overflow: hidden;
  margin-top: 3rpx;
  color: #172327;
  font-size: 24rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.form-label-row { display: flex; align-items: center; justify-content: space-between; }
.clear-value { color: #087f8c; font-size: 21rpx; }
.placeholder { color: #aab4b5; }
</style>
