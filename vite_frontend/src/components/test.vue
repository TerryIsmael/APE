<script setup>
import Timer from './Timer.vue';

const myItem = {
    remainingTime: 90,
    active: true,
    initialDate: new Date(),
    duration: 100
};
</script>

<template>
<Timer :item="myItem">

</Timer>
</template>