// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL || 'http://localhost:3000',
      supabaseUrl: process.env.SUPABASE_URL || 'https://cmkknuvydqetzmdpzzqv.supabase.co',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    }
  }
})
