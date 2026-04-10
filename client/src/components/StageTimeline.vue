<template>
  <view class="stage-timeline">
    <view
      v-for="stage in stages"
      :key="stage.id"
      class="stage-item"
      :class="{ 'stage-done': isStageDone(stage.id), 'stage-current': isStageCurrent(stage.id) }"
    >
      <view class="stage-dot">
        <text v-if="isStageDone(stage.id)" class="dot-check">&#10003;</text>
        <text v-else-if="isStageCurrent(stage.id)" class="dot-active"></text>
      </view>
      <view class="stage-info">
        <view class="stage-row">
          <text class="stage-name">{{ stage.name }}</text>
          <text v-if="getProgressRecord(stage.id)" class="stage-qty">
            {{ getProgressRecord(stage.id)?.outputQuantity ?? '-' }}/{{ getProgressRecord(stage.id)?.inputQuantity ?? '-' }}
          </text>
          <text v-if="getProgressRecord(stage.id)?.defectQuantity" class="stage-defect">
            不良: {{ getProgressRecord(stage.id)?.defectQuantity }}
          </text>
        </view>
        <text v-if="getDate(stage.id)" class="stage-date">{{ getDate(stage.id) }}</text>
      </view>
      <view v-if="stage.stageOrder < stages.length" class="stage-line"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProcessStage, ProgressRecord } from "../types";

const props = defineProps<{
  stages: ProcessStage[];
  progressRecords: ProgressRecord[];
}>();

function getProgressRecord(stageId: number): ProgressRecord | undefined {
  return props.progressRecords?.find((r) => r.stageId === stageId);
}

function isStageDone(stageId: number): boolean {
  const record = getProgressRecord(stageId);
  return record?.status === "completed";
}

function isStageCurrent(stageId: number): boolean {
  const record = getProgressRecord(stageId);
  return record?.status === "in_progress";
}

function getDate(stageId: number): string {
  const record = getProgressRecord(stageId);
  if (!record?.completedAt && !record?.createdAt) return "";
  const d = new Date(record.completedAt || record.createdAt);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
</script>

<style scoped lang="scss">
.stage-timeline {
  padding: 12rpx 0;
}
.stage-item {
  display: flex;
  align-items: flex-start;
  position: relative;
  padding-bottom: 24rpx;
  padding-left: 48rpx;
}
.stage-dot {
  position: absolute;
  left: 0;
  top: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stage-done .stage-dot {
  background: #07c160;
}
.stage-current .stage-dot {
  background: #0083ff;
}
.dot-check {
  color: #fff;
  font-size: 22rpx;
}
.dot-active {
  width: 16rpx;
  height: 16rpx;
  background: #fff;
  border-radius: 50%;
}
.stage-line {
  position: absolute;
  left: 17rpx;
  top: 40rpx;
  width: 2rpx;
  height: calc(100% - 40rpx);
  background: #e5e5e5;
}
.stage-done .stage-line {
  background: #07c160;
}
.stage-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.stage-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.stage-name {
  font-size: 28rpx;
  color: #333;
}
.stage-qty {
  font-size: 24rpx;
  color: #666;
}
.stage-defect {
  font-size: 24rpx;
  color: #fa5151;
}
.stage-date {
  font-size: 22rpx;
  color: #999;
}
</style>
