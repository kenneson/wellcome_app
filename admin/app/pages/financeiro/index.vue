<template>
  <div>
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-bold text-white tracking-tight">Gestao de Saques</h2>
        <p class="text-slate-400 mt-1">Aprove solicitacoes de PIX pendentes dos anfitrioes.</p>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400">Carregando dados financeiros...</div>
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
      {{ error }}
    </div>

    <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="text-xs uppercase bg-slate-800/50 text-slate-400">
            <tr>
              <th scope="col" class="px-6 py-4 font-semibold">Anfitriao / ID</th>
              <th scope="col" class="px-6 py-4 font-semibold">Valor</th>
              <th scope="col" class="px-6 py-4 font-semibold">Chave PIX</th>
              <th scope="col" class="px-6 py-4 font-semibold">Data da Solicitacao</th>
              <th scope="col" class="px-6 py-4 font-semibold">Status</th>
              <th scope="col" class="px-6 py-4 font-semibold text-right">Acao</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="wd in withdrawals" :key="wd.id" class="hover:bg-slate-800/30 transition-colors">
              <td class="px-6 py-4 font-medium text-white">
                <div class="font-semibold">{{ wd.userName || 'Anfitriao desconhecido' }}</div>
                <div class="text-xs text-slate-500 mt-0.5 font-mono">{{ wd.userId }}</div>
              </td>
              <td class="px-6 py-4 font-medium text-emerald-400">
                R$ {{ Number(wd.amount).toFixed(2).replace('.', ',') }}
              </td>
              <td class="px-6 py-4 text-slate-400">
                <span class="block">{{ wd.pixKey }}</span>
                <span class="text-xs text-slate-500">{{ wd.pixKeyType || 'Nao definido' }}</span>
              </td>
              <td class="px-6 py-4 text-slate-400">
                {{ new Date(wd.createdAt).toLocaleString('pt-BR') }}
              </td>
              <td class="px-6 py-4">
                <span v-if="wd.status === 'PENDING'" class="bg-yellow-500/10 text-yellow-500 text-xs font-medium px-2.5 py-1 rounded-full border border-yellow-500/20">
                  Pendente
                </span>
                <span v-else-if="wd.status === 'COMPLETED'" class="bg-emerald-500/10 text-emerald-500 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Concluido
                </span>
                <span v-else-if="wd.status === 'FAILED'" class="bg-red-500/10 text-red-500 text-xs font-medium px-2.5 py-1 rounded-full border border-red-500/20">
                  Falhou
                </span>
                <span v-else class="bg-slate-500/10 text-slate-400 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-500/20">
                  {{ wd.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button 
                  v-if="wd.status === 'PENDING'"
                  @click="approveWithdrawal(wd.id)"
                  :disabled="processingId === wd.id"
                  class="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  <span v-if="processingId === wd.id">Processando...</span>
                  <span v-else>Aprovar PIX</span>
                </button>
                <div v-else-if="wd.efiEndToEndId" class="text-xs text-slate-500 uppercase tracking-wider">
                  {{ wd.efiEndToEndId.substring(0, 8) }}...
                </div>
              </td>
            </tr>
            
            <tr v-if="withdrawals.length === 0 && !loading">
              <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                Nenhuma solicitacao de saque encontrada.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminFetch } from '../../lib/admin-api';

definePageMeta({
  middleware: ['admin-auth'],
})

useHead({
  title: 'Saques Pendentes | Wellcome Admin',
})

const withdrawals = ref([]);
const loading = ref(true);
const error = ref('');
const processingId = ref(null);

const fetchWithdrawals = async () => {
  try {
    const response = await adminFetch('/admin/withdrawals');
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Falha ao carregar saques');
    }

    withdrawals.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data';
  } finally {
    loading.value = false;
  }
}

const approveWithdrawal = async (id) => {
  if (!confirm('Tem certeza? O valor sera transferido imediatamente da conta EFI para a chave PIX do cliente.')) return;

  processingId.value = id;

  try {
    const response = await adminFetch(`/admin/withdrawals/${id}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Falha ao aprovar saque');
    }

    const result = await response.json();
    const index = withdrawals.value.findIndex((w) => w.id === id);
    if (index !== -1) {
      withdrawals.value[index].status = 'COMPLETED';
      withdrawals.value[index].efiEndToEndId = result.efiEndToEndId || 'Processado pela rede PIX';
    }

    alert('PIX enviado com sucesso!');
  } catch (err) {
    alert(`Erro ao enviar PIX: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
  } finally {
    processingId.value = null;
  }
}

onMounted(() => fetchWithdrawals())
</script>
