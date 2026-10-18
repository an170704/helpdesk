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
        path: 'profile',
        name: 'profile',
        component: () => import('../views/user/ProfileView.vue'),
      },
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
        path: 'faq',
        name: 'faq',
        component: () => import('../views/user/FAQView.vue'),
      },
      {
        path: 'faq/:id',
        name: 'faq-article',
        component: () => import('../views/user/FAQArticleView.vue'),
      },
      {
        path: 'kb',
        name: 'kb-list',
        component: () => import('../views/admin/KbListView.vue'),
        meta: { roles: ['admin', 'technician'] },
      },
      {
        path: 'kb/new',
        name: 'kb-create',
        component: () => import('../views/admin/KbFormView.vue'),
        meta: { roles: ['admin', 'technician'] },
      },
      {
        path: 'kb/:id/edit',
        name: 'kb-edit',
        component: () => import('../views/admin/KbFormView.vue'),
        meta: { roles: ['admin', 'technician'] },
      },
      {
        path: 'admin',
        name: 'admin-queue',
        component: () => import('../views/admin/AdminQueueView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/admin/DashboardView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/tickets/new',
        name: 'admin-ticket-create',
        component: () => import('../views/admin/AdminCreateTicketView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/admin/SettingsView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'settings/business-hours',
        name: 'settings-business-hours',
        component: () => import('../views/admin/BusinessHoursSettingsView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'settings/auto-assignment',
        name: 'settings-auto-assignment',
        component: () => import('../views/admin/AutoAssignmentSettingsView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'chatbot',
        name: 'chatbot-settings',
        component: () => import('../views/admin/ChatbotView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'assigned',
        name: 'assigned-tickets',
        component: () => import('../views/technician/AssignedTicketsView.vue'),
        meta: { roles: ['technician'] },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/admin/UserListView.vue'),
        meta: { roles: ['admin'], directory: 'members' },
      },
      {
        path: 'agents',
        name: 'agents',
        component: () => import('../views/admin/UserListView.vue'),
        meta: { roles: ['admin'], directory: 'agents' },
      },
      {
        path: 'groups',
        name: 'groups',
        component: () => import('../views/admin/GroupListView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'groups/:id',
        name: 'group-detail',
        component: () => import('../views/admin/GroupDetailView.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'users/:id',
        name: 'member-detail',
        component: () => import('../views/admin/MemberDetailView.vue'),
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
