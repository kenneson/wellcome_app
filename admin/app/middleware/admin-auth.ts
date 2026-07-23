import { ensureAdminSession } from '../lib/admin-api';

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path === '/login') {
    return;
  }

  const admin = await ensureAdminSession();
  if (!admin) {
    return navigateTo('/login');
  }
});
