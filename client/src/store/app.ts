import { defineStore } from "pinia";
import { ref } from "vue";
import type { ProcessStage } from "../types";
import { progressApi } from "../api/modules";

export const useAppStore = defineStore("app", () => {
  const stages = ref<ProcessStage[]>([]);
  const stagesLoaded = ref(false);

  async function loadStages() {
    if (stagesLoaded.value) return stages.value;
    stages.value = await progressApi.stages();
    stagesLoaded.value = true;
    return stages.value;
  }

  function getStageName(stageId: number): string {
    return stages.value.find((s) => s.id === stageId)?.name ?? "未知工序";
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      completed: "#07c160",
      in_progress: "#0083ff",
      active: "#0083ff",
      archived: "#999999",
    };
    return colors[status] || "#999999";
  }

  function getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      urgent: "紧急",
      normal: "普通",
    };
    return labels[priority] || priority;
  }

  return { stages, stagesLoaded, loadStages, getStageName, getStatusColor, getPriorityLabel };
});
