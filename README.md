
  # Rotisería Los Hermanos App

  This is a code bundle for Rotisería Los Hermanos App. The original project is available at https://www.figma.com/design/OKcg2iq0XUofYOrkAgIlv9/Rotiser%C3%ADa-Los-Hermanos-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Backend / integraciones (FUDO, WhatsApp)

  Hay un backend separado en `server/` que maneja las integraciones con FUDO
  y con el agente de WhatsApp (Twilio), respaldado por una base PostgreSQL.

  ### Base de datos (una sola vez)

  Necesitás Postgres corriendo localmente y un rol/base dedicados para la
  app (no uses el superusuario `postgres` directo). Con pgAdmin (o `psql`),
  conectado como `postgres`, corré estas dos sentencias **una por vez**
  (`CREATE DATABASE` no puede ir junto con otra sentencia):

  ```sql
  CREATE ROLE los_hermanos_app WITH LOGIN PASSWORD 'ELEGI_UNA_CONTRASEÑA';
  ```
  ```sql
  CREATE DATABASE los_hermanos OWNER los_hermanos_app;
  ```
  ```sql
  ALTER ROLE los_hermanos_app CREATEDB;
  ```

  (El último permiso lo necesita Prisma Migrate para crear una base
  temporal de comparación al generar migraciones.)

  ### Levantar el backend

  ```
  cd server
  cp .env.example .env
  # completar DATABASE_URL en .env con la contraseña que elegiste arriba,
  # y las credenciales de FUDO/WhatsApp cuando estén disponibles
  npm i
  npm run db:migrate   # crea las tablas
  npm run dev
  ```

  Con el backend corriendo en `http://localhost:4000` y el frontend en
  `http://localhost:5173`, la pestaña **Administración → Integraciones**
  muestra el estado de cada conexión.
  