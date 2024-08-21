<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../utils/UtilsFunctions.js";

const props = defineProps({
  ws: {
    type: Object,
    required: true
  },
});

const user = ref({ username: "", firstName: "", surnames: "", password: "", email: "" });
const router = useRouter();
const passwordMatch = ref("");
const errorMessage = ref([]);
const successMessage = ref("");

const register = async () => {
  if (errorMessage.value.includes("Las contraseñas no coinciden")) {
    return;
  }

  try {
    errorMessage.value = [];
    const response = await fetch(import.meta.env.VITE_BACKEND_URL + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.value.username,
        password: user.value.password,
        firstName: user.value.firstName,
        surnames: user.value.surnames,
        email: user.value.email,
      }),
    })
 
    if (response.status === 201) {
      successMessage.value = "Usuario registrado correctamente";
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } else {
      errorMessage.value = [];
      if (response.status === 500) {
        errorMessage.value.push("Error en el servidor. Inténtelo de nuevo más tarde.");
      } else {
        errorMessage.value = [];
        const data = await response.json();
        if (data.error || data.errors) {
          Utils.parseErrorMessage(data, errorMessage);
        } else {
          throw new Error("Error al registrar");
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const checkPassword = () => {
  if (passwordMatch.value !== user.value.password && passwordMatch.value !== "" && user.value.password !== "") {
    if (!errorMessage.value.includes("Las contraseñas no coinciden")) {
      errorMessage.value.unshift("Las contraseñas no coinciden");
    }
  } else {
    errorMessage.value = errorMessage.value.filter(
      (error) => error !== "Las contraseñas no coinciden"
    );
  }
};

watch([() => user.value.password, passwordMatch], checkPassword);

</script>

<template>

  <div style="min-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; align-items: center">
    <div class="container">
      <div class="register-container" style="height: auto;">
        <h2><span class="gradient-text">Registro</span></h2>
        <form @submit.prevent="register">
          <p v-if="successMessage" class="success">{{ successMessage }}</p>
          <div class="form">
            <div class="form-column" style="margin-right: 2%">
              <div class="form-group">
                <label for="username">Usuario:</label>
                <input type="text" minlength="4" maxlength="16" id="username" v-model="user.username" required/>
              </div>
              <div class="form-group">
                <label for="firstName">Nombre:</label>
                <input type="text" maxlength="100" id="firstName" v-model="user.firstName" required/>
              </div>
              <div class="form-group">
                <label for="password">Contraseña:</label>
                <input type="password" minlength="12" id="password" v-model="user.password" required/>
              </div>
            </div>

            <div class="form-column" style="margin-left: 2%">
              <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" maxlength="163" id="email" v-model="user.email" required />
              </div>
              <div class="form-group">
                <label for="surnames">Apellidos:</label>
                <input type="text" maxlength="100" id="surnames" v-model="user.surnames" required/>
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirmar Contraseña:</label>
                <input type="password" minlength="12" id="confirmPassword" v-model="passwordMatch" required/>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: center">
            <button type="submit">Registrarse</button>
          </div>
          <div class="error" v-if="errorMessage.length !== 0" style="display: flex; justify-content: space-between; margin-top: 5px;">
            <div>
              <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
                {{ error }}
              </p>
            </div>
          </div>
        </form> 
      </div>
    </div>

    <div style="width: 100%; height: 15%;">
      ¿Ya tienes cuenta? <button type="button" @click="$router.push('/login')" style="margin: 2%">Iniciar Sesión</button>
    </div>
  
  </div>
</template>

<style scoped>

.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80%;
  width: 100%;
}

.register-container {
  padding: 2%;
  max-width: 40vw;
  width: 100%;
  border: 3px solid transparent;
  border-image: linear-gradient(90deg, #646cff, #C8B1E4);
  border-image-slice: 1;
}

.register-container form {
  display: flex;
  flex-direction: column;
  place-items: center;
}

.register-container h2 {
  text-align: center;
}

.form {
  display: flex;
  justify-content: center;
}

.register-container form .form-group {
  display: flex;
  flex-direction: column;
}

.register-container form .form-group input {
  padding: 5px;
  border-radius: 5px;
  background-color: #f9f9f9;
  border: 1px solid #f9f9f9;
  color: black;
  width: 100%;
  box-sizing: border-box;
}

.register-container form button {
  margin: 5%;
}

.register-container form .error {
  grid-column: 1 / -1;
  text-align: center;
  width: fit-content;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
  padding: 1px 10px;
}

.register-container form .success {
  width: fit-content;
  background-color: rgb(29, 100, 29);
  border-radius: 10px;
  padding: 1px 10px;
}

.form-group {
  margin-bottom: 15px;
}

.error {
  grid-column: 1 / -1;
  text-align: center;
  justify-content: center;
  width: fit-content; 
  max-width: 80%; 
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
  padding: 1px 10px;
  margin-bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  overflow-wrap: break-word;
}

</style>