<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center px-6">
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8">
      <div class="mb-8">
        <p class="text-xs uppercase tracking-[0.25em] text-emerald-400/80 mb-3">Wellcome Admin</p>
        <h1 class="text-3xl font-bold text-white">Entrar no painel</h1>
        <p class="text-slate-400 mt-2">Use sua conta autorizada para acessar saques e verificacoes KYC.</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="block text-sm text-slate-300 mb-2">E-mail</label>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"
            placeholder="admin@wellcome.app"
            required
          />
        </div>

        <div>
          <label class="block text-sm text-slate-300 mb-2">Senha</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"
            placeholder="Sua senha"
            required
          />
        </div>

        <p v-if="error" class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          <span v-if="loading">Entrando...</span>
          <span v-else>Entrar</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ensureAdminSession } from '../lib/admin-api';
import { useAdminSupabase } from '../lib/supabase';

definePageMeta({
  layout: false,
});

useHead({
  title: 'Login | Wellcome Admin',
});

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const router = useRouter();
const supabase = useAdminSupabase();

async function handleLogin() {
  if (loading.value) return;

  loading.value = true;
  error.value = '';

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (signInError) {
      throw signInError;
    }

    const admin = await ensureAdminSession();
    if (!admin) {
      await supabase.auth.signOut();
      throw new Error('Sua conta nao possui permissao de administrador.');
    }

    await router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel entrar.';
  } finally {
    loading.value = false;
  }
}
</script>
