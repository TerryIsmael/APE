import { createRouter, createWebHistory } from 'vue-router'
import login from './components/login.vue'
import register from './components/register.vue'
import workspace from './components/workspace.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/login',name: 'login', component: login},
        {path: '/register',name: 'register', component: register},
        {path: '/workspace/:path*',name: 'workspace', component: workspace},
    ] 
})

export default router;