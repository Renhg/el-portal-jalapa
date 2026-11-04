El Portal Jalapa

Plataforma web de pedidos en línea que conecta restaurantes con sus clientes.

Tecnologías

Frontend

Angular 22

TypeScript

HTML y CSS

Backend

Python

FastAPI

PyMySQL

JWT para autenticación

Argon2 para protección de contraseñas

Base de datos

MariaDB

Estructura del proyecto

adminfood/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── uploads/
├── public/
├── src/
├── angular.json
└── package.json

Requisitos

Node.js y npm

Python 3

MariaDB

Desarrollo local

1. Frontend

cd ~/adminfood
npm install
npm start

Frontend: http://localhost:4200

2. Backend

cd ~/adminfood/backend
python -m venv myenv
source myenv/bin/activate
pip install -r requirements.txt

Configura las variables de entorno en backend/.env antes de iniciar el servidor.

python -m uvicorn main:app --reload

API: http://127.0.0.1:8000

Documentación de la API: http://127.0.0.1:8000/docs

Construcción para producción

cd ~/adminfood
npx ng build

Los archivos compilados se generan en dist/.

Seguridad

Las credenciales se configuran mediante variables de entorno.

Los archivos .env no deben subirse al repositorio.

Las contraseñas se almacenan mediante hash Argon2.

La autenticación utiliza tokens JWT.

Estado

Proyecto en desarrollo.
