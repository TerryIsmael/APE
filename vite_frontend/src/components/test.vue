<script setup>
import Timer from './Timer.vue';
const props = defineProps({
        ws: {
            ws: Object,
            required: true
        },
    });
const myItem = {
    _id:"6660a65997225f1aa938aa9d",
    remainingTime: 0,
    active: false,
    initialDate: new Date(),
    duration: 120000
};
</script>

<template>
<Timer :item="myItem" :ws="ws" :workspace="'66602b13fbe4a2613d036271'">

</Timer>
</template>