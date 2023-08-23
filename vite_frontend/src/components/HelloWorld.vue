<script setup lang="ts">

import { Ref, ref } from 'vue';

defineProps<{ msg: string }>()

let var1: Ref<String> = ref("Hola mundo")
let users: Ref<any> = ref([]);
 
const fetchData = async () => {
  try {
    const response = await fetch("http://127.0.0.1:8000/users");
    const data = await response.json();
    users.value = ref(data.users) as Ref<any>; 
    console.log((users.value));
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

const changeMessage = () =>{
  if (var1.value==="Hola mundo"){
    var1.value = "¡Mensaje cambiado!";
  }else{
    var1.value = "Hola mundo"
  }
} 

const count = ref(0)

</script>

<template>
  <h1>{{ var1 }}</h1>

  <div class="card">
    <button type="button" @click="changeMessage">count is {{ count }}</button>
    <p>
      <button type="button" @click="fetchData">Buscar usuarios</button>
      <br />
      <br />
      Aquí tienes una lista de usuarios: 
      <ul>
        <li v-for="(user, index) in users.value" :key="index">{{ user.name }}</li>
      </ul>
    </p> 
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Install
    <a href="https://github.com/vuejs/language-tools" target="_blank">Volar</a>
    in your IDE for a better DX
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
