<template>
  <view class="stage-timeline">
    <view
      v-for="(stage, index) in stages"
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
        </view>
        <view class="stage-meta">
          <text v-if="getDate(stage.id)" class="stage-date">{{ getDate(stage.id) }}</text>
          <text v-if="getDuration(stage.id)" class="stage-duration">{{ getDuration(stage.id) }}</text>
        </view>
      </view>
      <view v-if="index < stages.length - 1" class="stage-line"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProcessStage, ProgressRecord } from "../types";
import { formatTime } from "../utils/format";

const props = defineProps<{
  stages: ProcessStage[];
  progressRecords: ProgressRecord[];
}>();

function getProgressRecord(stageId: number): ProgressRecord | undefined {
  return props.progressRecords?.find((r) => r.stageId === stageId);
}

function isStageDone(stageId: number): boolean {
  return getProgressRecord(stageId)?.status === "completed";
}

function isStageCurrent(stageId: number): boolean {
  return getProgressRecord(stageId)?.status === "in_progress";
}

function getDate(stageId: number): string {
  const record = getProgressRecord(stageId);
  return record?.createdAt ? formatTime(record.createdAt) : "";
}

function getDuration(stageId: number): string {
  const record = getProgressRecord(stageId);
  if (!record?.createdAt) return "";
  // 找到前一道已完成工序的 createdAt，计算时间差
  const currentOrder = props.stages.find((s) => s.id === stageId)?.stageOrder;
  if (currentOrder === undefined) return "";
  const prevStages = props.stages.filter((s) => s.stageOrder < currentOrder);
  for (let i = prevStages.length - 1; i >= 0; i--) {
    const prevRecord = getProgressRecord(prevStages[i].id);
    if (prevRecord?.createdAt) {
      const ms = new Date(record.createdAt).getTime() - new Date(prevRecord.createdAt).getTime();
      if (ms <= 0) return "";
      const totalMinutes = Math.floor(ms / (1000 * 60));
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const mins = totalMinutes % 60;
      if (days > 0) return `${days}天${hours > 0 ? hours + "小时" : ""}`;
      if (hours > 0) return `${hours}小时${mins > 0 ? mins + "分" : ""}`;
      return `${mins}分钟`;
    }
  }
  return "";
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
  flex: 1;
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
.stage-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.stage-date {
  font-size: 22rpx;
  color: #999;
}
.stage-duration {
  font-size: 22rpx;
  color: #0083ff;
  background: #f0f7ff;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
</style>
