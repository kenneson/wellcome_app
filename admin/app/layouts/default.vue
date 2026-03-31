<template>
  <div class="min-h-screen bg-slate-950 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div class="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 class="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Wellcome Admin
        </h1>
      </div>
      
      <nav class="flex-1 p-4 space-y-2">
        <NuxtLink to="/" class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors hover:bg-slate-800"
                  active-class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          <span class="font-medium">Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/financeiro" class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors hover:bg-slate-800"
                  active-class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span class="font-medium">Saques Pix</span>
        </NuxtLink>
      </nav>
      
      <div class="p-4 border-t border-slate-800">
        <button class="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded border border-slate-700 hover:bg-slate-800 transition-colors text-slate-400">
          Sair
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-screen overflow-hidden">
      <!-- Header Mobile -->
      <header class="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 md:hidden">
        <h1 class="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Wellcome
        </h1>
      </header>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-auto p-6 md:p-8">
        <div class="max-w-7xl mx-auto">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
