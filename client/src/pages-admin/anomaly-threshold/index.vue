<template>
  <view class="container">
    <view class="card">
      <text class="section-title text-bold">异常预警设置</text>
      <text class="page-desc">开启后，首页将显示「异常预警」区块：加工中批次超过阈值天数无进度更新时进行提示。</text>

      <!-- 启用开关 -->
      <view class="setting-row mt-md">
        <view class="setting-row-left">
          <text class="setting-label">启用异常预警</text>
          <text class="setting-hint">关闭后首页不再显示异常预警区块（默认关闭）</text>
        </view>
        <switch :checked="enabled" color="#087f8c" @change="onEnabledChange" />
      </view>

      <!-- 阈值 -->
      <view class="form-group mt-md">
        <text class="form-label">无进度更新天数</text>
        <view class="threshold-input-wrap">
          <input v-model="daysInput" type="number" class="form-input" placeholder="请输入天数" :disabled="!enabled" />
          <text class="unit">天</text>
        </view>
        <text class="form-hint">支持 1 - 10 天，默认 5 天；仅启用状态下生效</text>
      </view>

      <button class="btn btn-primary btn-block mt-lg" :loading="saving" @click="save">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { settingsApi } from "../../api/modules";

const enabled = ref(false);
const daysInput = ref("");
const saving = ref(false);

onMounted(async () => {
  try {
    const config = await settingsApi.getAnomalyConfig();
    enabled.value = config.enabled;
    daysInput.value = String(config.thresholdDays);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});

function onEnabledChange(event: any) {
  enabled.value = event.detail.value;
}

async function save() {
  const days = Number(daysInput.value);
  if (!Number.isInteger(days) || days < 1 || days > 10) {
    uni.showToast({ title: "请输入 1 - 10 的整数", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    const config = await settingsApi.updateAnomalyConfig({ enabled: enabled.value, thresholdDays: days });
    enabled.value = config.enabled;
    daysInput.value = String(config.thresholdDays);
    uni.showToast({ title: "保存成功", icon: "success" });
  } catch (e: unknown) {
    uni.showModal({ title: "保存失败", content: (e as Error).message, showCancel: false });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.page-desc {
  display: block;
  margin-top: 8rpx;
  color: #7d898b;
  font-size: 22rpx;
  line-height: 1.6;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}
.setting-row-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.setting-label {
  color: #172327;
  font-size: 28rpx;
  font-weight: 600;
}
.setting-hint {
  color: #a0a8a9;
  font-size: 20rpx;
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
