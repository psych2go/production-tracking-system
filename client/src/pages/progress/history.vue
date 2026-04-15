<template>
  <view class="container">
    <view v-if="stageName" class="card">
      <text class="text-lg text-bold">{{ stageName }} - 产品列表（{{ productCount }}批产品，{{ trialCount }}批试验）</text>
    </view>
    <view v-for="record in records" :key="record.id" class="card record-card" @click="goBatchDetail(record.batchId)">
      <view class="flex-between">
        <view class="flex-center">
          <text class="text-bold">{{ record.batch?.batchNo }} {{ record.batch?.product?.model || '' }}</text>
          <view v-if="record.batch?.priority === 'urgent'" class="urgent-tag">急</view>
        </view>
        <text class="text-secondary text-sm">{{ formatTime(record.createdAt) }}</text>
      </view>
      <view class="flex-between mt-sm">
        <text class="text-sm">流转到 {{ record.stage?.name }} <text class="text-secondary ml-sm">{{ record.operator?.name }}</text></text>
        <text class="text-primary text-sm">查看详情 ></text>
      </view>
    </view>
    <view v-if="!records.length" class="card text-center">
      <text class="text-secondary">暂无数据</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { progressApi } from "../../api/modules";
import { formatTime } from "../../utils/format";
import type { ProgressRecord } from "../../types";

const records = ref<ProgressRecord[]>([]);
const stageId = ref(0);
const stageName = ref("");

const productCount = computed(() => records.value.filter((r) => r.batch?.batchType !== "trial").length);
const trialCount = computed(() => records.value.filter((r) => r.batch?.batchType === "trial").length);

onLoad((query) => {
  if (query?.stageId) {
    stageId.value = Number(query.stageId);
    stageName.value = query.stageName || "";
  }
});

onMounted(async () => {
  try {
    if (stageId.value) {
      records.value = await progressApi.stageProducts(stageId.value);
    } else {
      records.value = (await progressApi.list()).items;
    }
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});

function goBatchDetail(batchId: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${batchId}` });
}
</script>

<style scoped lang="scss">
.record-card { padding: 24rpx; }
</style>
