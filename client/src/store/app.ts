import { defineStore } from "pinia";
import { ref } from "vue";
import type { ProcessStage } from "../types";
import { progressApi } from "../api/modules";
import { STATUS_COLORS, PRIORITIES } from "../utils/constants";

export const useAppStore = defineStore("app", () => {
  const stages = ref<ProcessStage[]>([]);
  let stagesLoadedAt = 0;
  const STAGES_TTL = 5 * 60 * 1000; // 5 minutes

  async function loadStages() {
    if (stages.value.length && Date.now() - stagesLoadedAt < STAGES_TTL) return stages.value;
    stages.value = await progressApi.stages();
    stagesLoadedAt = Date.now();
    return stages.value;
  }

  function getStatusColor(status: string): string {
    return STATUS_COLORS[status] || "#999999";
  }

  function getPriorityLabel(priority: string): string {
    return PRIORITIES.find(p => p.value === priority)?.label || priority;
  }

  return { stages, loadStages, getStatusColor, getPriorityLabel };
});
