<template>
  <div>
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-bold text-white tracking-tight">Verificação KYC</h2>
        <p class="text-slate-400 mt-1">Gerencie verificações de identidade pendentes.</p>
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

    <!-- Error/Loading states -->
    <div v-if="loading" class="text-slate-400">Carregando verificações KYC...</div>
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
      {{ error }}
    </div>

    <!-- KYC Cards Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div 
        v-for="user in filteredUsers" 
        :key="user.id"
        class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
      >
        <!-- Header -->
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
              <p class="font-semibold text-white">{{ user.fullName || 'Usuário' }}</p>
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

        <!-- Images Side by Side -->
        <div class="p-6">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Documento</p>
              <div v-if="user.kycDocumentUrl" class="relative group">
                <img 
                  :src="getStorageUrl(user.kycDocumentUrl)" 
                  class="w-full h-40 object-cover rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-colors"
                  @click="openImage(getStorageUrl(user.kycDocumentUrl))"
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
              <div v-if="user.kycSelfieUrl" class="relative group">
                <img 
                  :src="getStorageUrl(user.kycSelfieUrl)" 
                  class="w-full h-40 object-cover rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-colors"
                  @click="openImage(getStorageUrl(user.kycSelfieUrl))"
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

          <!-- Score & Info -->
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

          <!-- Rejection reason if any -->
          <div v-if="user.kycRejectionReason" class="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-4">
            <p class="text-xs text-red-400">
              <strong>Razão da rejeição:</strong> {{ user.kycRejectionReason }}
            </p>
          </div>

          <!-- Actions -->
          <div v-if="user.kycStatus === 'PENDING'" class="flex gap-3">
            <button 
              @click="approveKyc(user.id)"
              :disabled="processingId === user.id"
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <span v-if="processingId === user.id">Processando...</span>
              <span v-else>✓ Aprovar</span>
            </button>
            <button 
              @click="rejectKyc(user.id)"
              :disabled="processingId === user.id"
              class="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              <span v-if="processingId === user.id">Processando...</span>
              <span v-else>✕ Rejeitar</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredUsers.length === 0 && !loading" class="col-span-2 text-center py-16">
        <p class="text-slate-500 text-lg">Nenhuma verificação KYC encontrada.</p>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="selectedImage" @click="selectedImage = null" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center cursor-pointer">
      <img :src="selectedImage" class="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { createClient } from '@supabase/supabase-js';

useHead({
  title: 'KYC Verificações | Wellcome Admin',
})

const config = useRuntimeConfig();
const supabaseUrl = config.public.supabaseUrl || 'https://cmkknuvydqetzmdpzzqv.supabase.co';
const supabaseServiceKey = config.public.supabaseServiceKey || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    'NOT_SUBMITTED': 'Não Enviado',
    'PENDING': 'Pendente',
    'APPROVED': 'Aprovado',
    'REJECTED': 'Rejeitado',
  };
  return labels[status] || status;
};

const getStorageUrl = (path) => {
  if (!path) return '';
  return `${supabaseUrl}/storage/v1/object/authenticated/kyc-documents/${path}`;
};

const openImage = (url) => {
  selectedImage.value = url;
};

const fetchUsers = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, city, kyc_status, kyc_document_url, kyc_selfie_url, kyc_similarity_score, kyc_submitted_at, kyc_reviewed_at, kyc_rejection_reason')
      .neq('kyc_status', 'NOT_SUBMITTED')
      .order('kyc_submitted_at', { ascending: false });

    if (fetchError) throw fetchError;

    users.value = (data || []).map(u => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      city: u.city,
      kycStatus: u.kyc_status,
      kycDocumentUrl: u.kyc_document_url,
      kycSelfieUrl: u.kyc_selfie_url,
      kycSimilarityScore: u.kyc_similarity_score,
      kycSubmittedAt: u.kyc_submitted_at,
      kycReviewedAt: u.kyc_reviewed_at,
      kycRejectionReason: u.kyc_rejection_reason,
    }));
  } catch (err) {
    error.value = 'Erro ao carregar verificações: ' + (err.message || err);
  } finally {
    loading.value = false;
  }
};

const approveKyc = async (userId) => {
  if (!confirm('Confirma a aprovação manual deste usuário?')) return;
  
  processingId.value = userId;
  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'APPROVED',
        kyc_reviewed_at: new Date().toISOString(),
        kyc_rejection_reason: null,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Update UI optimistically
    const index = users.value.findIndex(u => u.id === userId);
    if (index !== -1) {
      users.value[index].kycStatus = 'APPROVED';
      users.value[index].kycReviewedAt = new Date().toISOString();
      users.value[index].kycRejectionReason = null;
    }
    alert('Usuário aprovado com sucesso!');
  } catch (err) {
    alert('Erro ao aprovar: ' + (err.message || err));
  } finally {
    processingId.value = null;
  }
};

const rejectKyc = async (userId) => {
  const reason = prompt('Informe o motivo da rejeição:');
  if (!reason) return;
  
  processingId.value = userId;
  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'REJECTED',
        kyc_reviewed_at: new Date().toISOString(),
        kyc_rejection_reason: reason,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    const index = users.value.findIndex(u => u.id === userId);
    if (index !== -1) {
      users.value[index].kycStatus = 'REJECTED';
      users.value[index].kycReviewedAt = new Date().toISOString();
      users.value[index].kycRejectionReason = reason;
    }
    alert('Usuário rejeitado.');
  } catch (err) {
    alert('Erro ao rejeitar: ' + (err.message || err));
  } finally {
    processingId.value = null;
  }
};

onMounted(() => fetchUsers());
</script>
