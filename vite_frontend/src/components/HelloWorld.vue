<script setup lang="ts">

import { Ref, ref } from 'vue';

defineProps<{ msg: string }>()

let var1: Ref<String> = ref("Hola mundo")
let users = ref(( fetch("http://127.0.0.1:8000/users")))

const fetchData = async() =>{
  console.log("Buscando...")
  users = (await(await fetch("http://127.0.0.1:8000/users")).json()).users1
  console.log(users)
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
      Aquí tienes una lista de usuarios: 
      <li v-for="(user, index) in users" :key="index">{{ user }}</li>
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
