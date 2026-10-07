import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { setPageMeta } from '../utils/seo'

import SiteLayout from '../components/SiteLayout.vue'
import StaffLayout from '../views/staff/StaffLayout.vue'

function requireAuth(to, from, next) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn.value) return next('/login')
  return next()
}

function requireStaff(to, from, next) {
  const { isLoggedIn, isStaff } = useAuth()
  if (!isLoggedIn.value) return next('/login')
  if (!isStaff.value) return next('/')
  return next()
}

function requirePerm(to, from, next) {
  const { isLoggedIn, isStaff, hasPerm } = useAuth()
  if (!isLoggedIn.value) return next('/login')
  if (!isStaff.value) return next('/')
  if (to.meta.perm && !hasPerm(to.meta.perm)) return next('/staff')
  return next()
}

function requirePermId(to, from, next) {
  const { isLoggedIn, isStaff, hasPermId } = useAuth()
  if (!isLoggedIn.value) return next('/login')
  if (!isStaff.value) return next('/')
  if (to.meta.permId && !hasPermId(to.meta.permId)) return next('/staff')
  return next()
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },

  routes: [
    {
      path: '/',
      component: SiteLayout,
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import('../views/Home.vue'),
          meta: {
            seo: {
              title: 'Emergency Lighting & Digital Roblox Products | KGM Cloud',
              description:
                'KGM Cloud sells digital products for Roblox roleplay servers, led by KGM-ELS, a fully customisable emergency lighting system with V2V synchronisation.',
            },
          },
        },
        {
          path: 'about',
          name: 'About',
          component: () => import('../views/About.vue'),
          meta: {
            seo: {
              title: 'About | KGM Cloud',
              description: 'Meet the team behind KGM Cloud and find out what we do for Roblox roleplay communities.',
            },
          },
        },
        {
          path: 'terms',
          name: 'Terms',
          component: () => import('../views/Terms.vue'),
          meta: {
            seo: {
              title: 'Terms of Service | KGM Cloud',
              description:
                'The terms and conditions that apply when you use the KGM Cloud website and its digital Roblox products.',
            },
          },
        },
        {
          path: 'cookies',
          name: 'Cookies',
          component: () => import('../views/Cookies.vue'),
          meta: {
            seo: {
              title: 'Cookie Policy | KGM Cloud',
              description:
                'How KGM Cloud uses cookies on the store, what each cookie does, and how to withdraw consent.',
            },
          },
        },
        {
          path: 'digital-products',
          name: 'DigitalProducts',
          component: () => import('../views/DigitalProducts.vue'),
          meta: {
            seo: {
              title: 'Digital Products, Cancellation & Refunds | KGM Cloud',
              description:
                'How KGM Cloud supplies digital products immediately, the waiver of the 14-day cooling-off period, and the refund policy for digital content.',
            },
          },
        },
        {
          path: 'privacy',
          name: 'Privacy',
          component: () => import('../views/Privacy.vue'),
          meta: {
            seo: {
              title: 'Privacy Policy | KGM Cloud',
              description:
                'How KGM Cloud collects, uses and protects personal information, and the data protection rights you have under UK GDPR.',
            },
          },
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('../views/Products.vue'),
          meta: {
            seo: {
              title: 'Products | KGM Cloud',
              description:
                'Browse the KGM Cloud range: emergency lighting systems, scripts and digital tools for Roblox roleplay servers, with configs and full documentation.',
            },
          },
        },
        {
          path: 'products/:id',
          name: 'ProductStore',
          component: () => import('../views/ProductStore.vue'),
          meta: {
            seo: {
              title: 'Products | KGM Cloud',
              description:
                'Browse the KGM Cloud range: emergency lighting systems, scripts and digital tools for Roblox roleplay servers, with configs and full documentation.',
            },
          },
        },
        {
          path: 'docs',
          name: 'Docs',
          component: () => import('../views/docs/DocsLanding.vue'),
          meta: {
            seo: {
              title: 'Documentation | KGM Cloud',
              description: 'Guides for every KGM Cloud product, from first-time setup to advanced configuration.',
            },
          },
        },
        {
          path: 'docs/:slug',
          name: 'DocDetail',
          component: () => import('../views/docs/DocDetail.vue'),
          meta: {
            seo: {
              title: 'Documentation | KGM Cloud',
              description: 'Guides for every KGM Cloud product, from first-time setup to advanced configuration.',
            },
          },
        },
        {
          path: 'login',
          name: 'Login',
          component: () => import('../views/Login.vue'),
          meta: { seo: { noindex: true, title: 'Login | KGM Cloud' } },
        },
        {
          path: 'register',
          name: 'Register',
          component: () => import('../views/Register.vue'),
          meta: { seo: { noindex: true, title: 'Register | KGM Cloud' } },
        },
        {
          path: 'verify-email',
          name: 'VerifyEmail',
          component: () => import('../views/VerifyEmail.vue'),
          meta: { seo: { noindex: true, title: 'Verify email | KGM Cloud' } },
        },
        {
          path: 'forgot-password',
          name: 'ForgotPassword',
          component: () => import('../views/ForgotPassword.vue'),
          meta: { seo: { noindex: true, title: 'Reset password | KGM Cloud' } },
        },
        {
          path: 'reset-password',
          name: 'ResetPassword',
          component: () => import('../views/ResetPassword.vue'),
          meta: { seo: { noindex: true, title: 'Reset password | KGM Cloud' } },
        },
        {
          path: 'checkout',
          name: 'Checkout',
          component: () => import('../views/Checkout.vue'),
          beforeEnter: requireAuth,
          meta: { seo: { noindex: true, title: 'Checkout | KGM Cloud' } },
        },
        {
          path: 'account',
          name: 'Account',
          component: () => import('../views/Account.vue'),
          beforeEnter: requireAuth,
          meta: { seo: { noindex: true, title: 'My account | KGM Cloud' } },
        },
        {
          path: 'account/tickets/:id',
          name: 'AccountTicketView',
          component: () => import('../views/account/TicketDetail.vue'),
          beforeEnter: requireAuth,
          meta: { seo: { noindex: true, title: 'My tickets | KGM Cloud' } },
        },
        {
          path: 'staff',
          component: StaffLayout,
          beforeEnter: requireStaff,
meta: { perm: 'view.customer', seo: { noindex: true, title: 'Staff | KGM Cloud' } },
          children: [
            {
              path: '',
              name: 'StaffDashboard',
              component: () => import('../views/staff/Dashboard.vue'),
            },
            {
              path: 'cx-dashboard',
              name: 'StaffCXDashboard',
              component: () => import('../views/staff/CxDashboard.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 7 },
            },
            {
              path: 'cx-dashboard/announcements/new',
              name: 'StaffCXAnnouncementNew',
              component: () => import('../views/staff/AnnouncementEditor.vue'),
              props: { cx: true },
              beforeEnter: requirePerm,
              meta: { perm: 'create.cxannouncements' },
            },
            {
              path: 'customers',
              name: 'StaffCustomers',
              component: () => import('../views/staff/Accounts.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 7 },
            },
            {
              path: 'customers/:id',
              name: 'StaffAccountView',
              component: () => import('../views/staff/AccountView.vue'),
              beforeEnter: requirePerm,
              meta: { perm: 'view.customer' },
            },
            {
              path: 'staff',
              name: 'StaffRoster',
              component: () => import('../views/staff/Staff.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33 },
            },
            {
              path: 'staff/:id',
              name: 'StaffMemberView',
              component: () => import('../views/staff/StaffView.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33 },
            },
            {
              path: 'products',
              name: 'StaffProducts',
              component: () => import('../views/staff/Products.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 25 },
            },
            {
              path: 'categories',
              name: 'StaffCategories',
              component: () => import('../views/staff/Categories.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 25 },
            },
            {
              path: 'roles',
              name: 'StaffRoles',
              component: () => import('../views/staff/RoleTitles.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33 },
            },
            {
              path: 'teams',
              name: 'StaffTeams',
              component: () => import('../views/staff/Teams.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33 },
            },
            {
              path: 'settings',
              name: 'StaffSettings',
              component: () => import('../views/staff/Settings.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33 },
            },
            {
              path: 'view-stats',
              name: 'StaffViewStats',
              component: () => import('../views/staff/ViewStats.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33 },
            },
            {
              path: 'discounts',
              name: 'StaffDiscounts',
              component: () => import('../views/staff/Discounts.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 34 },
            },
            {
              path: 'disputes',
              name: 'StaffDisputes',
              component: () => import('../views/staff/Disputes.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 33, seo: { noindex: true, title: 'Disputes | KGM Cloud' } },
            },
            {
              path: 'announcements/new',
              name: 'StaffAnnouncementNew',
              component: () => import('../views/staff/AnnouncementEditor.vue'),
              beforeEnter: requirePerm,
              meta: { perm: 'create.companyannouncements' },
            },
            {
              path: 'tickets',
              name: 'StaffTickets',
              component: () => import('../views/staff/Tickets.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 7 },
            },
            {
              path: 'bug-reports',
              name: 'StaffBugReports',
              component: () => import('../views/staff/BugReports.vue'),
              beforeEnter: requirePermId,
              meta: { permId: 25 },
            },
            {
              path: 'order-requests',
              name: 'StaffOrderRequests',
              component: () => import('../views/staff/OrderRequests.vue'),
            },
            {
              path: 'tickets/:id',
              name: 'StaffTicketView',
              component: () => import('../views/staff/TicketView.vue'),
              beforeEnter: requirePerm,
              meta: { perm: 'view.tickets' },
            },
            {
              path: 'applications',
              name: 'StaffApplications',
              component: () => import('../views/staff/PlaceholderView.vue'),
              props: { title: 'Applications' },
            },
          ],
        },
      ],
    },
    {
      path: '/staff/userdetails',
      component: () => import('../views/staff/UserDetailsLayout.vue'),
      beforeEnter: requirePerm,
      meta: { seo: { noindex: true, title: 'Staff | KGM Cloud' } },
      children: [
        {
          path: ':id?',
          name: 'UserDetails',
          component: () => import('../views/staff/UserDetailsView.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/staff/disputes/document',
      name: 'StaffDisputeDocument',
      component: () => import('../views/staff/DisputeDocument.vue'),
      beforeEnter: requirePermId,
      meta: { permId: 33, seo: { noindex: true, title: 'Dispute document | KGM Cloud' } },
    },
  ],
})

router.afterEach((to) => {
  const seo = to.meta.seo || {}
  setPageMeta({
    title: seo.title,
    description: seo.description,
    image: seo.image,
    ogType: seo.ogType,
    url: to.path,
    robots: seo.robots,
    noindex: seo.noindex,
  })
  if (!seo.noindex) {
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: to.path }),
    }).catch(() => {})
  }
})

export default router