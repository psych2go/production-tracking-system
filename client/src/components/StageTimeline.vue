<template>
  <scroll-view
    scroll-x
    scroll-with-animation
    class="stage-scroll"
    :scroll-into-view="currentStageElementId"
  >
    <view class="stage-timeline">
      <view
        v-for="(stage, index) in stages"
        :id="`timeline-stage-${stage.id}`"
        :key="stage.id"
        class="stage-item"
        :class="{
          'stage-done': isStageDone(stage.id),
          'stage-current': isStageCurrent(stage.id),
        }"
      >
        <view class="stage-track">
          <view class="stage-dot">
            <text v-if="isStageDone(stage.id)" class="dot-check">&#10003;</text>
            <text v-else class="dot-index">{{ index + 1 }}</text>
          </view>
          <view v-if="index < stages.length - 1" class="stage-line"></view>
        </view>

        <view class="stage-heading">
          <text class="stage-name">{{ stage.name }}</text>
          <text v-if="isStageCurrent(stage.id)" class="current-tag">当前</text>
        </view>
        <text v-if="getDate(stage.id)" class="stage-date">{{ getDate(stage.id) }}</text>
        <text v-if="getDuration(stage.id)" class="stage-duration">{{ getDuration(stage.id) }}</text>
        <text v-if="!getDate(stage.id)" class="stage-pending">待流转</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ProcessStage, ProgressRecord } from "../types";
import { formatTime } from "../utils/format";

const props = defineProps<{
  stages: ProcessStage[];
  progressRecords: ProgressRecord[];
}>();

const latestStageId = computed<number | null>(() => {
  if (!props.progressRecords?.length) return null;
  const latest = [...props.progressRecords]
    .filter((record) => Boolean(record.createdAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return latest?.stageId ?? null;
});

const currentStageElementId = computed(() =>
  latestStageId.value ? `timeline-stage-${latestStageId.value}` : ""
);

function getProgressRecord(stageId: number): ProgressRecord | undefined {
  return props.progressRecords?.find((record) => record.stageId === stageId);
}

function isStageDone(stageId: number): boolean {
  return getProgressRecord(stageId)?.status === "completed";
}

function isStageCurrent(stageId: number): boolean {
  return getProgressRecord(stageId)?.status === "in_progress" || latestStageId.value === stageId;
}

function getDate(stageId: number): string {
  const record = getProgressRecord(stageId);
  return record?.createdAt ? formatTime(record.createdAt) : "";
}

function getDuration(stageId: number): string {
  const record = getProgressRecord(stageId);
  if (!record?.createdAt) return "";
  const currentOrder = props.stages.find((stage) => stage.id === stageId)?.stageOrder;
  if (currentOrder === undefined) return "";
  const prevStages = props.stages.filter((stage) => stage.stageOrder < currentOrder);
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
.stage-scroll {
  width: 100%;
  margin-top: 16rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #edf0f0;
  white-space: nowrap;
}
.stage-timeline {
  display: inline-flex;
  min-width: 100%;
  padding: 4rpx 0 12rpx;
}
.stage-item {
  display: inline-flex;
  width: 176rpx;
  min-height: 170rpx;
  flex-shrink: 0;
  flex-direction: column;
  white-space: normal;
}
.stage-track {
  position: relative;
  height: 48rpx;
}
.stage-dot {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42rpx;
  height: 42rpx;
  border: 3rpx solid #dfe4e4;
  border-radius: 50%;
  background: #fff;
}
.stage-line {
  position: absolute;
  z-index: 1;
  left: 42rpx;
  right: 0;
  top: 20rpx;
  height: 3rpx;
  background: #dfe4e4;
}
.stage-done .stage-dot {
  border-color: #27865f;
  background: #27865f;
}
.stage-done .stage-line { background: #27865f; }
.stage-current .stage-dot {
  border-color: #087f8c;
  background: #087f8c;
  box-shadow: 0 0 0 7rpx rgba(8, 127, 140, 0.12);
}
.dot-check { color: #fff; font-size: 22rpx; font-weight: 700; }
.dot-index { color: #aab4b5; font-size: 19rpx; font-weight: 600; }
.stage-heading {
  display: flex;
  align-items: center;
  gap: 7rpx;
  min-width: 0;
  padding-right: 12rpx;
}
.stage-name {
  overflow: hidden;
  color: #2c383c;
  font-size: 24rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stage-current .stage-name { color: #087f8c; font-weight: 700; }
.current-tag {
  flex-shrink: 0;
  padding: 1rpx 6rpx;
  border-radius: 4rpx;
  background: #e6f4f3;
  color: #075e68;
  font-size: 17rpx;
  font-weight: 600;
}
.stage-date,
.stage-pending {
  margin-top: 7rpx;
  padding-right: 12rpx;
  color: #7d898b;
  font-size: 19rpx;
  white-space: nowrap;
}
.stage-pending { color: #aab4b5; }
.stage-duration {
  align-self: flex-start;
  max-width: 156rpx;
  overflow: hidden;
  margin-top: 6rpx;
  padding: 2rpx 8rpx;
  border-radius: 5rpx;
  background: #e6f4f3;
  color: #075e68;
  font-size: 18rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
