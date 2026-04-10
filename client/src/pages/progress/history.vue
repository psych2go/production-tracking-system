<template>
  <view class="container">
    <view v-if="stageName" class="card">
      <text class="text-lg text-bold">{{ stageName }} - 产品列表</text>
    </view>
    <view v-for="record in records" :key="record.id" class="card">
      <view class="flex-between">
        <text class="text-bold">{{ record.batch?.batchNo }}</text>
        <text class="text-secondary text-sm">{{ formatTime(record.createdAt) }}</text>
      </view>
      <view class="mt-sm">
        <text class="text-secondary">{{ record.batch?.product?.model }}</text>
        <text class="text-secondary ml-sm">数量: {{ record.batch?.quantity }}</text>
      </view>
      <view class="mt-sm">
        <text>投入: {{ record.inputQuantity ?? '-' }} | 产出: {{ record.outputQuantity ?? '-' }}</text>
        <text v-if="record.defectQuantity" class="text-danger ml-sm">不良: {{ record.defectQuantity }}</text>
      </view>
      <view class="mt-sm">
        <text class="text-secondary text-sm">操作员: {{ record.operator?.name }}</text>
      </view>
    </view>
    <view v-if="!records.length" class="card text-center">
      <text class="text-secondary">暂无数据</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { progressApi } from "../../api/modules";
import type { ProgressRecord } from "../../types";

const records = ref<ProgressRecord[]>([]);
const stageId = ref(0);
const stageName = ref("");

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

onLoad((query) => {
  if (query?.stageId) {
    stageId.value = Number(query.stageId);
    stageName.value = query.stageName || "";
  }
});

onMounted(async () => {
  if (stageId.value) {
    try {
      records.value = await progressApi.stageProducts(stageId.value);
    } catch (e: unknown) {
      uni.showToast({ title: (e as Error).message, icon: "none" });
    }
  } else {
    // Load my history
    try {
      const res = await progressApi.list();
      records.value = res.items;
    } catch (e: unknown) {
      uni.showToast({ title: (e as Error).message, icon: "none" });
    }
  }
});
</script>

<style scoped lang="scss">
</style>
