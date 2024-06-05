import { createRouter, createWebHistory } from 'vue-router'
import login from './components/login.vue'
import register from './components/register.vue'
import workspace from './components/workspace.vue'
import notices from './components/notices.vue'
import test from './components/test.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/login', name: 'login', component: login},
        {path: '/register', name: 'register', component: register},
        {path: '/notices', name: 'notices', component: notices},
        {path: '/workspace/:path*', name: 'workspace', component: workspace},
        {path: '/test', name: 'test', component:test},
    ] 
})

export default router;