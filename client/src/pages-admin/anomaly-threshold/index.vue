<template>
  <view class="container">
    <view class="card">
      <text class="section-title text-bold">异常预警阈值</text>
      <text class="setting-desc">加工中批次超过该天数无进度更新时，将在首页「异常预警」中提示。</text>

      <view class="form-group mt-md">
        <text class="form-label">无进度更新天数</text>
        <view class="threshold-input-wrap">
          <input v-model="daysInput" type="number" class="form-input" placeholder="请输入天数" />
          <text class="unit">天</text>
        </view>
        <text class="form-hint">支持 1 - 10 天，默认 5 天</text>
      </view>

      <button class="btn btn-primary btn-block mt-lg" :loading="saving" @click="save">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { settingsApi } from "../../api/modules";

const daysInput = ref("");
const saving = ref(false);

onMounted(async () => {
  try {
    const { days } = await settingsApi.getAnomalyThreshold();
    daysInput.value = String(days);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});

async function save() {
  const days = Number(daysInput.value);
  if (!Number.isInteger(days) || days < 1 || days > 10) {
    uni.showToast({ title: "请输入 1 - 10 的整数", icon: "none" });
    return;
  }

  saving.value = true;
  try {
    await settingsApi.updateAnomalyThreshold(days);
    uni.showToast({ title: "保存成功", icon: "success" });
  } catch (e: unknown) {
    uni.showModal({ title: "保存失败", content: (e as Error).message, showCancel: false });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.setting-desc {
  display: block;
  margin-top: 8rpx;
  color: #7d898b;
  font-size: 22rpx;
  line-height: 1.6;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form-label {
  font-size: 26rpx;
  color: #485458;
  font-weight: 600;
}
.threshold-input-wrap {
  position: relative;
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  padding: 20rpx 72rpx 20rpx 24rpx;
  font-size: 28rpx;
  background: #f5f7f7;
}
.unit {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  color: #7d898b;
  font-size: 26rpx;
}
.form-hint {
  color: #a0a8a9;
  font-size: 20rpx;
}
.mt-md { margin-top: 24rpx; }
.mt-lg { margin-top: 40rpx; }
</style>
