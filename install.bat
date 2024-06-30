@echo off
:: Cambiar al directorio de trabajo
cd express_backend

:: Ejecutar el comando bun run test
bun install

:: Mostrar un mensaje al finalizar
cd ../vite_frontend

:: Ejecutar el comando bun run test
bun install
