<template>
  <view class="container">
    <!-- Filters -->
    <view class="card filter-card">
      <view class="filter-row">
        <picker :range="actionOptions" @change="(e: any) => filters.action = actionValues[e.detail.value] || ''">
          <view class="filter-item">{{ filters.action ? actionLabel(filters.action) : '操作类型' }}</view>
        </picker>
        <picker :range="entityOptions" @change="(e: any) => filters.entity = entityValues[e.detail.value] || ''">
          <view class="filter-item">{{ filters.entity || '对象类型' }}</view>
        </picker>
        <text class="text-primary text-sm" @click="loadLogs">筛选</text>
      </view>
    </view>

    <!-- Logs list -->
    <view v-for="log in logs" :key="log.id" class="card log-card">
      <view class="flex-between">
        <view class="log-user">
          <text class="text-bold">{{ log.user?.name ?? '未知' }}</text>
          <view class="action-tag" :class="`tag-${log.action}`">{{ actionLabel(log.action) }}</view>
        </view>
        <text class="text-secondary text-sm">{{ formatTime(log.createdAt) }}</text>
      </view>
      <view class="mt-sm">
        <text class="text-sm">{{ entityLabel(log.entity) }}<text v-if="log.entityId"> #{{ log.entityId }}</text></text>
      </view>
      <view v-if="log.detail" class="detail-toggle" @click="toggleDetail(log.id)">
        <text class="text-sm text-secondary">{{ expandedIds.has(log.id) ? '收起详情' : '查看详情' }}</text>
      </view>
      <view v-if="expandedIds.has(log.id) && log.detail" class="detail-box mt-sm">
        <text class="text-sm">{{ formatDetail(log.detail) }}</text>
      </view>
    </view>

    <view v-if="!logs.length" class="card text-center mt-md">
      <text class="text-secondary">暂无审计日志</text>
    </view>

    <!-- Load more -->
    <view v-if="hasMore" class="load-more mt-md" @click="loadMore">
      <text class="text-primary text-sm">加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { auditApi } from "../../api/modules";
import type { AuditLog } from "../../types";

const logs = ref<AuditLog[]>([]);
const page = ref(1);
const hasMore = ref(false);
const expandedIds = reactive(new Set<number>());

const actionOptions = ["全部", "创建", "更新", "删除", "录入", "解决", "登录"];
const actionValues = ["", "create", "update", "delete", "upsert", "resolve", "login"];
const entityOptions = ["全部", "批次", "进度", "缺陷", "返工", "用户", "工序", "认证"];
const entityValues = ["", "batch", "progress", "defect", "rework", "user", "stage", "auth"];

const filters = reactive({
  action: "",
  entity: "",
});

function actionLabel(action: string): string {
  const map: Record<string, string> = { create: "创建", update: "更新", delete: "删除", upsert: "录入", resolve: "解决", login: "登录" };
  return map[action] ?? action;
}

function entityLabel(entity: string): string {
  const map: Record<string, string> = { batch: "批次", progress: "进度", defect: "缺陷", rework: "返工", user: "用户", stage: "工序", auth: "认证" };
  return map[entity] ?? entity;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDetail(detail: string): string {
  try {
    const obj = JSON.parse(detail);
    return JSON.stringify(obj, null, 2);
  } catch {
    return detail;
  }
}

function toggleDetail(id: number) {
  if (expandedIds.has(id)) {
    expandedIds.delete(id);
  } else {
    expandedIds.add(id);
  }
}

async function loadLogs() {
  page.value = 1;
  try {
    const result = await auditApi.logs({
      action: filters.action || undefined,
      entity: filters.entity || undefined,
      page: 1,
    });
    logs.value = result.items;
    hasMore.value = result.items.length < result.total;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function loadMore() {
  page.value++;
  try {
    const result = await auditApi.logs({
      action: filters.action || undefined,
      entity: filters.entity || undefined,
      page: page.value,
    });
    logs.value.push(...result.items);
    hasMore.value = logs.value.length < result.total;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadLogs);
</script>

<style scoped lang="scss">
.filter-card {
  padding: 20rpx 24rpx;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.filter-item {
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #666;
}
.log-card {
  padding: 20rpx 24rpx;
}
.log-user {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.action-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.tag-create { background: #e8f5e9; color: #4caf50; }
.tag-update { background: #e3f2fd; color: #2196f3; }
.tag-delete { background: #fce4ec; color: #f44336; }
.tag-upsert { background: #e0f7fa; color: #00bcd4; }
.tag-resolve { background: #fff3e0; color: #ff9800; }
.tag-login { background: #f3e5f5; color: #9c27b0; }
.detail-toggle {
  margin-top: 8rpx;
}
.detail-box {
  background: #f5f5f5;
  padding: 16rpx;
  border-radius: 8rpx;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
.load-more {
  text-align: center;
  padding: 20rpx;
}
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.text-center { text-align: center; }
.mt-sm { margin-top: 8rpx; }
.mt-md { margin-top: 24rpx; }
</style>
