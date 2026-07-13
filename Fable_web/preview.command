#!/bin/bash
# Doble clic para ver la web en tu navegador (http://localhost:8080)
cd "$(dirname "$0")"
node build.js
open "http://localhost:8080"
python3 -m http.server 8080 --directory public
