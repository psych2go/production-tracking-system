<template>
  <view class="batch-type-tabs">
    <view
      class="type-tab"
      :class="{ active: modelValue === 'product' }"
      @click="select('product')"
    >
      <text>产品</text>
    </view>
    <view
      class="type-tab"
      :class="{ active: modelValue === 'trial' }"
      @click="select('trial')"
    >
      <text>试验</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ modelValue: "product" | "trial" }>();
const emit = defineEmits<{ "update:modelValue": ["product" | "trial"] }>();

function select(type: "product" | "trial") {
  emit("update:modelValue", type);
}
</script>

<style scoped lang="scss">
.batch-type-tabs {
  display: flex;
  gap: 16rpx;
}
.type-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666;
  background: #f5f5f5;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.active {
    background: #0083ff;
    color: #fff;
    border-color: #0083ff;
    font-weight: 500;
  }
}
</style>
