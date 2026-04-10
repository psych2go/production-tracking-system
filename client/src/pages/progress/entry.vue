<template>
  <view class="container">
    <view v-if="!userStore.isLoggedIn" class="card" style="text-align:center;padding:80rpx">
      <text class="text-secondary">请先在首页登录</text>
    </view>

    <view v-else>
      <!-- Step 1: Select Batch -->
      <view v-if="step === 1" class="card">
        <text class="section-title text-bold">选择批次</text>
        <view class="search-box mt-sm">
          <input
            v-model="batchKeyword"
            placeholder="搜索批号或型号"
            class="search-input"
            @confirm="searchBatches"
          />
        </view>
        <view class="mt-md">
          <view
            v-for="batch in batches"
            :key="batch.id"
            class="batch-option"
            :class="{ selected: selectedBatch?.id === batch.id }"
            @click="selectBatch(batch)"
          >
            <view class="flex-between">
              <text class="text-bold">{{ batch.batchNo }}</text>
              <text class="text-secondary text-sm">{{ batch.product?.model }}</text>
            </view>
            <text class="text-sm text-secondary mt-sm">数量: {{ batch.quantity }}</text>
          </view>
          <view v-if="!batches.length" class="text-center mt-lg text-secondary">
            <text>暂无活跃批次</text>
          </view>
        </view>
        <button class="btn-primary mt-lg" :disabled="!selectedBatch" @click="step = 2">下一步</button>
      </view>

      <!-- Step 2: Select Stage -->
      <view v-if="step === 2" class="card">
        <view class="flex-between">
          <text class="section-title text-bold">选择工序</text>
          <text class="text-secondary text-sm" @click="step = 1">返回选批次</text>
        </view>
        <view class="batch-summary mt-sm">
          <text>{{ selectedBatch?.batchNo }} | {{ selectedBatch?.product?.model }} | {{ selectedBatch?.quantity }}件</text>
        </view>
        <view class="stage-list mt-md">
          <view
            v-for="stage in appStore.stages"
            :key="stage.id"
            class="stage-option"
            :class="{
              selected: selectedStage?.id === stage.id,
              done: isStageCompleted(stage.id),
            }"
            @click="selectStage(stage)"
          >
            <view class="stage-order">{{ stage.stageOrder }}</view>
            <text class="stage-name">{{ stage.name }}</text>
            <text v-if="isStageCompleted(stage.id)" class="text-success text-sm">已完成</text>
          </view>
        </view>
        <button class="btn-primary mt-lg" :disabled="!selectedStage" @click="step = 3">下一步</button>
      </view>

      <!-- Step 3: Input quantities -->
      <view v-if="step === 3" class="card">
        <view class="flex-between">
          <text class="section-title text-bold">录入数据</text>
          <text class="text-secondary text-sm" @click="step = 2">返回选工序</text>
        </view>
        <view class="batch-summary mt-sm">
          <text>{{ selectedBatch?.batchNo }} → {{ selectedStage?.name }}</text>
        </view>

        <view class="form-group mt-lg">
          <text class="form-label">投入数量</text>
          <input v-model="form.inputQuantity" type="number" placeholder="投入数量" class="form-input" />
        </view>
        <view class="form-group mt-md">
          <text class="form-label">产出数量</text>
          <input v-model="form.outputQuantity" type="number" placeholder="产出数量" class="form-input" />
        </view>
        <view class="form-group mt-md">
          <text class="form-label">不良数量</text>
          <input v-model="form.defectQuantity" type="number" placeholder="0" class="form-input" />
        </view>
        <view v-if="Number(form.defectQuantity) > 0" class="form-group mt-md">
          <text class="form-label">不良类型</text>
          <picker :range="defectTypes" @change="(e: any) => form.defectType = defectTypes[e.detail.value]">
            <view class="form-input picker-value">{{ form.defectType || '请选择' }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">备注</text>
          <textarea v-model="form.notes" placeholder="备注信息（可选）" class="form-textarea" />
        </view>

        <button class="btn-primary mt-lg" :loading="submitting" @click="submitProgress">提交</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { batchApi, progressApi } from "../../api/modules";
import type { Batch, ProcessStage } from "../../types";

const userStore = useUserStore();
const appStore = useAppStore();

const step = ref(1);
const batchKeyword = ref("");
const batches = ref<Batch[]>([]);
const selectedBatch = ref<Batch | null>(null);
const selectedStage = ref<ProcessStage | null>(null);
const submitting = ref(false);

const defectTypes = ["裂纹", "键合不良", "污染", "尺寸异常", "外观不良", "其他"];

const form = ref({
  inputQuantity: "",
  outputQuantity: "",
  defectQuantity: "0",
  defectType: "",
  notes: "",
});

async function searchBatches() {
  try {
    const res = await batchApi.list({ status: "active", keyword: batchKeyword.value });
    batches.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function selectBatch(batch: Batch) {
  selectedBatch.value = batch;
}

function selectStage(stage: ProcessStage) {
  selectedStage.value = stage;
  // Pre-fill with batch quantity
  if (!form.value.inputQuantity) {
    form.value.inputQuantity = String(selectedBatch.value?.quantity ?? "");
  }
}

function isStageCompleted(stageId: number): boolean {
  return selectedBatch.value?.progressRecords?.some(
    (r) => r.stageId === stageId && r.status === "completed"
  ) ?? false;
}

async function submitProgress() {
  if (!selectedBatch.value || !selectedStage.value) return;

  submitting.value = true;
  try {
    await progressApi.create({
      batchId: selectedBatch.value.id,
      stageId: selectedStage.value.id,
      inputQuantity: Number(form.value.inputQuantity) || undefined,
      outputQuantity: Number(form.value.outputQuantity) || undefined,
      defectQuantity: Number(form.value.defectQuantity) || 0,
      defectType: form.value.defectType || undefined,
      notes: form.value.notes || undefined,
    });

    uni.showToast({ title: "录入成功", icon: "success" });

    // Reset form
    form.value = { inputQuantity: "", outputQuantity: "", defectQuantity: "0", defectType: "", notes: "" };
    selectedStage.value = null;
    step.value = 1;

    // Reload batches
    await searchBatches();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onShow(() => {
  if (userStore.isLoggedIn) {
    searchBatches();
  }
});

onMounted(() => {
  appStore.loadStages();
});
</script>

<style scoped lang="scss">
.search-box {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}
.search-input {
  font-size: 28rpx;
}
.batch-option {
  padding: 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  &.selected { border-color: #0083ff; background: #f0f7ff; }
}
.stage-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.stage-option {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  gap: 20rpx;
  &.selected { border-color: #0083ff; background: #f0f7ff; }
  &.done { opacity: 0.5; }
}
.stage-order {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #666;
}
.stage-name {
  flex: 1;
}
.batch-summary {
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 26rpx;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form-label {
  font-size: 26rpx;
  color: #666;
}
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
.picker-value {
  color: #333;
}
.btn-primary {
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  text-align: center;
  &[disabled] {
    opacity: 0.5;
  }
}
.section-title {
  font-size: 32rpx;
}
</style>
