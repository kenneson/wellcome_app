<template>
  <div>
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
      <p class="text-slate-400 mt-1">Visão geral da plataforma Wellcome.</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full"></div>
        <p class="text-slate-400 text-sm font-medium">Usuários Ativos</p>
        <p class="mt-2 text-3xl font-bold text-white">42</p>
      </div>
      
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full"></div>
        <p class="text-slate-400 text-sm font-medium">Eventos</p>
        <p class="mt-2 text-3xl font-bold text-white">12</p>
      </div>

      <div class="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full"></div>
        <p class="text-slate-400 text-sm font-medium">Receita de Taxas</p>
        <p class="mt-2 text-3xl font-bold text-white">R$ 540,20</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['admin-auth'],
})

useHead({
  title: 'Dashboard | Wellcome Admin',
})
</script>
