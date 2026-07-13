#!/bin/bash
# Doble clic para regenerar la web en /public
cd "$(dirname "$0")"
node build.js
echo ""
read -p "Listo. Pulsa Enter para cerrar..."
