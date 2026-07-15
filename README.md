
  # Rotisería Los Hermanos App

  This is a code bundle for Rotisería Los Hermanos App. The original project is available at https://www.figma.com/design/OKcg2iq0XUofYOrkAgIlv9/Rotiser%C3%ADa-Los-Hermanos-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Backend / integraciones (FUDO, WhatsApp)

  Hay un backend separado en `server/` que maneja las integraciones con FUDO
  y con el agente de WhatsApp (Twilio). Para levantarlo:

  ```
  cd server
  cp .env.example .env   # completar credenciales cuando estén disponibles
  npm i
  npm run dev
  ```

  Con el backend corriendo en `http://localhost:4000` y el frontend en
  `http://localhost:5173`, la pestaña **Administración → Integraciones**
  muestra el estado de cada conexión.
  