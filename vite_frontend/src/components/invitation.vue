<script setup>
import { ref, onBeforeMount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Utils from '../utils/UtilsFunctions.js'

const router = useRouter();
const route = useRoute();
const invitationCode = ref(null);
const invitation = ref(null);
const errorMessage = ref([]);
const fetched = ref(false);

const applyInvitation = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invite/'+invitationCode.value, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify()
        });
        if (response.ok) {
            localStorage.setItem('workspace', invitation.value.workspace._id);
            router.push('/workspace/');
        } else {
            errorMessage.value = [];
            const data = await response.json()
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al procesar la invitación");
            }
        }
    } catch (error) {
        console.log(error);
    }
}

const fetchInvitation = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invite/'+invitationCode.value, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include"
        });
        if (response.ok) {
            const data = await response.json();
            invitation.value = data;
            fetched.value = true;
        } else {
            errorMessage.value = [];
            const data = await response.json()
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al cargar la invitación");
            }
        }
    } catch (error) {
        console.log(error);
    }
}

const parsePerm = (perm) => {
    switch (perm) {
        case "Read":
            return "Lectura";
        case "Write":
            return "Escritura";
        case "Admin":
            return "Administrador";
        default:
            return "Lectura";
    }
}

onBeforeMount( async () => {
    invitationCode.value = route.params.invitationCode;
    await fetchInvitation();
    const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: "include",
      body: JSON.stringify({
        username: "prueba6",
        password: "12345678910aA@",
      })
    });
})

</script>

<template>
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
        <div class="invitation-container">
            <h1>Invitación</h1>
            <div v-if="fetched">
                <p>Estás a punto de unirte al siguiente workspace:</p>
                <p style="margin-bottom:0"><strong>{{ invitation?.workspace.name }}</strong></p>
                <p style="margin-top:0"> {{ invitation?.workspace.numUsers }} persona{{invitation?.workspace.numUsers>1?"s":""}}</p>
                <p v-if="invitation?.profile">Entrará automáticamente con el perfil {{ invitation.profile.name }} y el permiso {{ parsePerm(invitation.profile.wsPerm) }}</p>
                <p v-else>Entrará con el permiso de lectura</p>
                <p style="margin-top:5%">¿Quieres continuar?</p>
                <div style="display:flex; justify-content: center; margin-bottom: 8%;">
                    <button @click="applyInvitation" style="margin-right:5px;">Aceptar</button>
                    <button @click="router.push('/workspace')" style="margin-left:5px;">Rechazar</button>
                </div>
            </div>
            <div v-else>
                <p>Ups. ha ocurrido un error con tu invitación.</p>
            </div>
            <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
                <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.error {
  grid-column: 1 / -1;
  text-align: center;
  justify-content: center;
  width: fit-content; 
  max-width: 80%; 
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
  padding-left: 1%; 
  padding-right: 1%;
  padding: 1px 10px;
  margin-bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  overflow-wrap: break-word;
}

.invitation-container {
  padding: 2%;
  max-width: 40vw;
  width: 100%;
  border: 3px solid transparent;
  border-image: linear-gradient(90deg, #646cff, #C8B1E4);
  border-image-slice: 1;
}
</style>