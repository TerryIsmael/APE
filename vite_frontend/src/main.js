import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import Modal from './components/Modal.vue'
import CKEditor from '@ckeditor/ckeditor5-vue';

const app = createApp(App); 
app.use(router);
app.use(CKEditor);
app.component('Modal', Modal);
app.mount('#app');
