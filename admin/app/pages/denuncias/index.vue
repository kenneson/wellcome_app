<template>
  <div>
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-bold text-white tracking-tight">Denúncias</h2>
        <p class="text-slate-400 mt-1">Modere conteúdo denunciado por usuários.</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="filterStatus = 'PENDING'"
          :class="filterStatus === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'"
          class="px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-slate-700"
        >
          Pendentes ({{ pendingCount }})
        </button>
        <button
          @click="filterStatus = 'ALL'"
          :class="filterStatus === 'ALL' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'"
          class="px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-slate-700"
        >
          Todas
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400">Carregando denúncias...</div>
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
      {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-for="report in filteredReports"
        :key="report.id"
        class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
      >
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-500/10 text-slate-300 border-slate-500/20">
              {{ targetLabel(report.targetType) }}
            </span>
            <span class="text-xs font-medium px-2.5 py-1 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
              {{ reasonLabel(report.reason) }}
            </span>
          </div>
          <span
            :class="{
              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20': report.status === 'PENDING',
              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': report.status === 'RESOLVED',
              'bg-slate-500/10 text-slate-400 border-slate-500/20': report.status === 'DISMISSED',
            }"
            class="text-xs font-medium px-2.5 py-1 rounded-full border"
          >
            {{ statusLabel(report.status) }}
          </span>
        </div>

        <div class="p-6">
          <p v-if="report.details" class="text-sm text-slate-300 mb-4">{{ report.details }}</p>
          <p v-else class="text-sm text-slate-500 italic mb-4">Sem descrição adicional.</p>

          <div class="text-xs text-slate-500 space-y-1 mb-4 font-mono">
            <div>Alvo (ID): <span class="text-slate-400">{{ report.targetId }}</span></div>
            <div>Denunciante: <span class="text-slate-400">{{ report.reporterId }}</span></div>
            <div>Recebida: {{ new Date(report.createdAt).toLocaleString('pt-BR') }}</div>
          </div>

          <div v-if="report.status === 'PENDING'" class="flex gap-3">
            <button
              @click="resolve(report.id, 'RESOLVED')"
              :disabled="processingId === report.id"
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <span v-if="processingId === report.id">Processando...</span>
              <span v-else>Resolver</span>
            </button>
            <button
              @click="resolve(report.id, 'DISMISSED')"
              :disabled="processingId === report.id"
              class="flex-1 bg-slate-700/40 hover:bg-slate-700 border border-slate-600 disabled:opacity-50 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              <span v-if="processingId === report.id">Processando...</span>
              <span v-else>Descartar</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredReports.length === 0 && !loading" class="col-span-2 text-center py-16">
        <p class="text-slate-500 text-lg">Nenhuma denúncia encontrada.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { adminFetch } from '../../lib/admin-api';

definePageMeta({
  middleware: ['admin-auth'],
})

useHead({
  title: 'Denúncias | Wellcome Admin',
})

const reports = ref([]);
const loading = ref(true);
const error = ref('');
const processingId = ref(null);
const filterStatus = ref('PENDING');

const pendingCount = computed(() => reports.value.filter(r => r.status === 'PENDING').length);

const filteredReports = computed(() => {
  if (filterStatus.value === 'ALL') return reports.value;
  return reports.value.filter(r => r.status === filterStatus.value);
});

const statusLabel = (status) => ({
  PENDING: 'Pendente',
  RESOLVED: 'Resolvida',
  DISMISSED: 'Descartada',
}[status] || status);

const targetLabel = (type) => ({
  EVENT: 'Evento',
  USER: 'Usuário',
  REVIEW: 'Avaliação',
}[type] || type);

const reasonLabel = (reason) => ({
  SPAM: 'Spam',
  HARASSMENT: 'Assédio',
  INAPPROPRIATE_CONTENT: 'Conteúdo impróprio',
  SCAM: 'Golpe',
  VIOLENCE: 'Violência',
  OTHER: 'Outro',
}[reason] || reason);

const fetchReports = async () => {
  try {
    const response = await adminFetch('/admin/reports');
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Erro ao carregar denúncias');
    }
    reports.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar denúncias';
  } finally {
    loading.value = false;
  }
};

const resolve = async (id, status) => {
  const verb = status === 'RESOLVED' ? 'resolver' : 'descartar';
  if (!confirm(`Confirma ${verb} esta denúncia?`)) return;

  processingId.value = id;
  try {
    const response = await adminFetch(`/admin/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Erro ao processar');
    }
    const index = reports.value.findIndex(r => r.id === id);
    if (index !== -1) reports.value[index].status = status;
  } catch (err) {
    alert(`Erro: ${err instanceof Error ? err.message : 'desconhecido'}`);
  } finally {
    processingId.value = null;
  }
};

onMounted(() => fetchReports());
</script>
