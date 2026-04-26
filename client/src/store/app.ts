import { defineStore } from "pinia";
import { ref } from "vue";
import type { ProcessStage } from "../types";
import { progressApi } from "../api/modules";
import { STATUS_COLORS } from "../utils/constants";

export const useAppStore = defineStore("app", () => {
  const stages = ref<ProcessStage[]>([]);

  async function loadStages() {
    if (stages.value.length) return stages.value;
    stages.value = await progressApi.stages();
    return stages.value;
  }

  function getStatusColor(status: string): string {
    return STATUS_COLORS[status] || "#999999";
  }

  function getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = { urgent: "紧急", normal: "普通" };
    return labels[priority] || priority;
  }

  return { stages, loadStages, getStatusColor, getPriorityLabel };
});
