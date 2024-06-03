<script>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

export default {
    setup() {

        const currentUser = ref(null);
        const router = useRouter();
        const route = useRoute();
        const path = ref("");
        const currentPath = ref('');
        const workspace = ref({});
        const notices = ref([]); 
    }
}



</script>


<template>
  <div>
    <h1>Notices</h1>
  </div>
</template>