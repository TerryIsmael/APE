<script setup>
import { ref, onBeforeMount } from 'vue';
import Utils from '../utils/UtilsFunctions.js';
import PdfEmbed, { useVuePdfEmbed } from 'vue-pdf-embed';
import 'vue-pdf-embed/dist/style/index.css'
import 'vue-pdf-embed/dist/style/annotationLayer.css'
import 'vue-pdf-embed/dist/style/textLayer.css'
import CKEditor from '@ckeditor/ckeditor5-vue';
import { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic';
import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { Bold, Italic } from '@ckeditor/ckeditor5-basic-styles';
import { Link } from '@ckeditor/ckeditor5-link';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { Alignment } from '@ckeditor/ckeditor5-alignment';  // Importing the package.
import { Autoformat } from '@ckeditor/ckeditor5-autoformat';
import { BlockQuote } from '@ckeditor/ckeditor5-block-quote';
import { Heading } from '@ckeditor/ckeditor5-heading';
const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    workspace: {
        type: Object,
        required: true
    },
    ws: {
        type: Object,
        required: true
    },
    path: {
        type: String,
        required: true
    }
});
const url = ref(null);
const errorMessage = ref([]);
const appToUse = ref(null);
const workspace = ref(props.workspace);

const editor = ref(ClassicEditor);
const editorConfig = {
    plugins: [
        Essentials,
        Bold,
        Italic,
        Link,
        Paragraph,
        Alignment,
        Autoformat,
        BlockQuote,
        Heading,
    ],
    language: 'es',
    toolbar: {
        items: [
            'undo',
            'redo',
            '|',
            'heading',
            'alignment',
            '|',
            'bold',
            'italic',
            'link',
            'bulletedList',
            'numberedList',
            '|',
            'outdent',
            'indent',
            '|',
            'imageUpload',
            'blockQuote',
            'insertTable',
            'mediaEmbed',
        ]
    },
}
const editorData = ref('<p>Contenido inicial del editor</p>'); //Para borrar

const loadFile = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({ workspace: props.workspace._id, fileId: props.item._id })
        });
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            url.value = blobUrl;
        } else {
            errorMessage.value = [];
            const data = await response.json();
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al editar chat");
            }
        }
    } catch (error) {
        console.log(error);
    }
};

onBeforeMount(async () => {
    await loadFile();
    switch(props.item.name.split('.').pop()){
        case 'pdf':
            appToUse.value = 'pdf';
            break;
        case 'docx':
            appToUse.value = 'CKEditor';
            break;
        default:
            appToUse.value = '';
            break;
    
    }
});
</script>

<template>
    <div v-if="appToUse === 'pdf'" style="display:flex; justify-content: center;">
        <pdf-embed annotation-layer text-layer :source="url" :width="600" :height="800" />
    </div>
    <div v-if="appToUse === 'CKEditor'" style="color:black">
        <ckeditor :editor="ClassicEditor" v-model="url" :config="editorConfig" ></ckeditor>
    </div>
</template>