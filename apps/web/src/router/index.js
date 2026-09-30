import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: () => import('../layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/user/HomeView.vue'),
      },
      {
        path: 'tickets',
        name: 'my-tickets',
        component: () => import('../views/user/TicketListView.vue'),
      },
      {
        path: 'tickets/new',
        name: 'ticket-create',
        component: () => import('../views/user/TicketCreateView.vue'),
      },
      {
        path: 'tickets/:id',
        name: 'ticket-detail',
        component: () => import('../views/user/TicketDetailView.vue'),
      },
      {
        path: 'admin',
        name: 'admin-queue',
        component: () => import('../views/admin/AdminQueueView.vue'),
        meta: { roles: ['admin'] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: '/' }
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) {
    return { path: '/' }
  }

  if (to.path === '/' && auth.isAuthenticated) {
    return { path: auth.homePath }
  }
})

export default router
