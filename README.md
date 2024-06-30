# APE

## ¿Qué es APE?

APE es una aplicación desarrollada para un trabajo de fin de grado universitario de la Universidad de Sevilla que aboga por aumentar la productividad en el ámbito educativo en una época digitalizada. Esta proporciona un espacio de trabajo tanto privados como públicos con permisos, que de forma centralizada contenga herramientas para gestión la del tiempo y el trabajo, como editores integrados, visores, temporizadores y calendarios. Además sirva para el almacenamiento organizado de documentos y en cuanto a comunicaciones cuenta con anuncios y un sistema de chats, para poder realizarlas de forma efectiva. 

## Guía de instalación

### Requisitos: 
- Tener el runtime Bun instalado.
- Tener MongoDB instalado, recomendamos el paquete Community Server que ofrecen.

### Pasos para la instalación: 
- Descargar la carpeta de código en este repositorio.
- Abrir una terminal, dirigirse al directorio de backend (cd .\express_backend) y ejecutar bun install.
- Abrir otra terminal, dirigirse al directorio de frontend (cd .\vite_frontend) y ejecutar bun install.
- Copiar los ficheros finalizados en .env y renombrarlos para que queden como .env y .test.env.
- Para iniciar los servidores, ejecutar bun run dev en cada terminal mencionada previamente.
- Para parar los servidores, hacer Ctrl + C en cada terminal.
