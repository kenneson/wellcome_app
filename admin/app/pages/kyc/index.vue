<template>
  <div>
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-bold text-white tracking-tight">Verificacao KYC</h2>
        <p class="text-slate-400 mt-1">Gerencie verificacoes de identidade pendentes.</p>
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
          Todos
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400">Carregando verificacoes KYC...</div>
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
      {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div 
        v-for="user in filteredUsers" 
        :key="user.id"
        class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
      >
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img 
              v-if="user.avatarUrl" 
              :src="user.avatarUrl" 
              class="w-10 h-10 rounded-full border-2 border-slate-700"
              :alt="user.fullName"
            />
            <div v-else class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-bold">
              {{ (user.fullName || '?').charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-white">{{ user.fullName || 'Usuario' }}</p>
              <p class="text-xs text-slate-500">{{ user.email }} · {{ user.city || '' }}</p>
            </div>
          </div>
          <span 
            :class="{
              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20': user.kycStatus === 'PENDING',
              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': user.kycStatus === 'APPROVED',
              'bg-red-500/10 text-red-500 border-red-500/20': user.kycStatus === 'REJECTED',
              'bg-slate-500/10 text-slate-400 border-slate-500/20': user.kycStatus === 'NOT_SUBMITTED',
            }"
            class="text-xs font-medium px-2.5 py-1 rounded-full border"
          >
            {{ statusLabel(user.kycStatus) }}
          </span>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Documento</p>
              <div v-if="user.kycDocumentSignedUrl" class="relative group">
                <img
                  :src="user.kycDocumentSignedUrl"
                  class="w-full h-40 object-cover rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-colors"
                  @click="openImage(user.kycDocumentSignedUrl)"
                />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                  <span class="text-white text-xs">Clique para ampliar</span>
                </div>
              </div>
              <div v-else class="w-full h-40 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                <span class="text-slate-500 text-sm">Sem imagem</span>
              </div>
            </div>
            <div>
              <p class="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Selfie</p>
              <div v-if="user.kycSelfieSignedUrl" class="relative group">
                <img
                  :src="user.kycSelfieSignedUrl"
                  class="w-full h-40 object-cover rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-colors"
                  @click="openImage(user.kycSelfieSignedUrl)"
                />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                  <span class="text-white text-xs">Clique para ampliar</span>
                </div>
              </div>
              <div v-else class="w-full h-40 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                <span class="text-slate-500 text-sm">Sem imagem</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-sm mb-4">
            <div class="text-slate-400">
              Score de Similaridade: 
              <span :class="{
                'text-emerald-400 font-bold': (user.kycSimilarityScore || 0) >= 90,
                'text-yellow-400 font-bold': (user.kycSimilarityScore || 0) >= 80 && (user.kycSimilarityScore || 0) < 90,
                'text-red-400 font-bold': (user.kycSimilarityScore || 0) < 80
              }">
                {{ user.kycSimilarityScore != null ? `${Math.round(user.kycSimilarityScore)}%` : 'N/A' }}
              </span>
            </div>
            <div class="text-slate-500 text-xs">
              Enviado: {{ user.kycSubmittedAt ? new Date(user.kycSubmittedAt).toLocaleString('pt-BR') : 'N/A' }}
            </div>
          </div>

          <div v-if="user.kycRejectionReason" class="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-4">
            <p class="text-xs text-red-400">
              <strong>Razao da rejeicao:</strong> {{ user.kycRejectionReason }}
            </p>
          </div>

          <div v-if="user.kycStatus === 'PENDING'" class="flex gap-3">
            <button 
              @click="approveKyc(user.id)"
              :disabled="processingId === user.id"
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <span v-if="processingId === user.id">Processando...</span>
              <span v-else>Aprovar</span>
            </button>
            <button 
              @click="rejectKyc(user.id)"
              :disabled="processingId === user.id"
              class="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              <span v-if="processingId === user.id">Processando...</span>
              <span v-else>Rejeitar</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredUsers.length === 0 && !loading" class="col-span-2 text-center py-16">
        <p class="text-slate-500 text-lg">Nenhuma verificacao KYC encontrada.</p>
      </div>
    </div>

    <div v-if="selectedImage" @click="selectedImage = null" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center cursor-pointer">
      <img :src="selectedImage" class="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" />
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
  title: 'KYC Verificacoes | Wellcome Admin',
})

const users = ref([]);
const loading = ref(true);
const error = ref('');
const processingId = ref(null);
const filterStatus = ref('PENDING');
const selectedImage = ref(null);

const pendingCount = computed(() => users.value.filter(u => u.kycStatus === 'PENDING').length);

const filteredUsers = computed(() => {
  if (filterStatus.value === 'ALL') return users.value.filter(u => u.kycStatus !== 'NOT_SUBMITTED');
  return users.value.filter(u => u.kycStatus === filterStatus.value);
});

const statusLabel = (status) => {
  const labels = {
    'NOT_SUBMITTED': 'Nao Enviado',
    'PENDING': 'Pendente',
    'APPROVED': 'Aprovado',
    'REJECTED': 'Rejeitado',
  };
  return labels[status] || status;
};

const openImage = (url) => {
  selectedImage.value = url;
};

const fetchUsers = async () => {
  try {
    const response = await adminFetch('/admin/kyc?status=ALL');
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Erro ao carregar verificacoes');
    }

    users.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar verificacoes';
  } finally {
    loading.value = false;
  }
};

const approveKyc = async (userId) => {
  if (!confirm('Confirma a aprovacao manual deste usuario?')) return;

  processingId.value = userId;
  try {
    const response = await adminFetch(`/admin/kyc/${userId}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Erro ao aprovar');
    }

    const index = users.value.findIndex(u => u.id === userId);
    if (index !== -1) {
      users.value[index].kycStatus = 'APPROVED';
      users.value[index].kycReviewedAt = new Date().toISOString();
      users.value[index].kycRejectionReason = null;
    }

    alert('Usuario aprovado com sucesso!');
  } catch (err) {
    alert(`Erro ao aprovar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
  } finally {
    processingId.value = null;
  }
};

const rejectKyc = async (userId) => {
  const reason = prompt('Informe o motivo da rejeicao:');
  if (!reason) return;

  processingId.value = userId;
  try {
    const response = await adminFetch(`/admin/kyc/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Erro ao rejeitar');
    }

    const index = users.value.findIndex(u => u.id === userId);
    if (index !== -1) {
      users.value[index].kycStatus = 'REJECTED';
      users.value[index].kycReviewedAt = new Date().toISOString();
      users.value[index].kycRejectionReason = reason;
    }

    alert('Usuario rejeitado.');
  } catch (err) {
    alert(`Erro ao rejeitar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
  } finally {
    processingId.value = null;
  }
};

onMounted(() => fetchUsers());
</script>
