# 🎾 PadelBook

**PadelBook** és una aplicació web full-stack per gestionar reserves de pistes de pàdel, desenvolupada amb **React**, **Node.js**, **Express** i **MySQL**.

El projecte està pensat com una plataforma escalable per a clubs esportius que necessiten gestionar disponibilitat, reserves, usuaris, rols, pistes, manteniments i comunicacions automàtiques amb els clients.

🌐 **Demo:** https://padelbook-chi.vercel.app  
👨‍💻 **Autor:** Pere Serra Tugores  
📌 **Projecte FCT / DAW**

---

## 📸 Captures de pantalla

> Recomanació: afegeix aquí captures reals del projecte abans d’enviar el currículum.

```md
![Home](./docs/screenshots/home.png)
![Disponibilitat](./docs/screenshots/availability.png)
![Panell d'administració](./docs/screenshots/admin.png)
![Les meves reserves](./docs/screenshots/my-reservations.png)
```

---

## 🚀 Descripció del projecte

PadelBook permet als usuaris consultar la disponibilitat de pistes, fer reserves per franges horàries i gestionar el seu historial de reserves de manera clara i intuïtiva.

A més, inclou un panell d’administració amb eines per gestionar reserves, usuaris, pistes, estadístiques, manteniments i logs del sistema.

L’objectiu principal del projecte és simular una aplicació real de gestió de reserves esportives, amb una arquitectura separada entre frontend, backend i base de dades.

---

## ✨ Funcionalitats principals

### 👤 Usuari

- Registre i inici de sessió.
- Autenticació mitjançant JWT.
- Verificació de correu electrònic.
- Consulta de disponibilitat per data i pista.
- Reserva de pistes per franges horàries.
- Selecció de durada de la reserva.
- Visualització de reserves actives i històric.
- Cancel·lació de reserves.
- Eliminació definitiva de reserves cancel·lades.
- Gestió del perfil personal.
- Canvi de contrasenya.
- Recepció d’emails automàtics de confirmació i cancel·lació.

---

### 👑 Administrador

- Visualització global de reserves.
- Cerca i filtres avançats.
- Gestió d’usuaris.
- Canvi de rols d’usuari.
- Gestió de pistes.
- Bloqueig de pistes per manteniment.
- Estadístiques generals del sistema.
- Estadístiques per pista, data i franja horària.
- Exportació de reserves a CSV.
- Consulta de logs administratius.

---

### 🧑‍💼 Gestor

- Accés al panell de gestió.
- Visualització i filtratge de reserves.
- Gestió de pistes i manteniments.
- Consulta d’estadístiques.
- Exportació de dades.

El rol **gestor** permet separar permisos entre administració total del sistema i gestió operativa del club.

---

## 🧠 Experiència d’usuari

PadelBook està desenvolupat amb una experiència d’usuari pròxima a una aplicació comercial real:

- Interfície responsive.
- Disseny modern i net.
- Feedback visual en accions importants.
- Prevenció de reserves no vàlides.
- Control d’hores passades.
- Control de disponibilitat en temps real.
- Missatges d’error clars.
- Components reutilitzables.
- Panells desplegables i detalls de reserves.
- Adaptació a dispositius mòbils.

---

## 🛠️ Stack tecnològic

### Frontend

- React
- Vite
- JavaScript
- CSS personalitzat
- React Router
- Axios
- Bootstrap

### Backend

- Node.js
- Express
- MySQL
- JWT
- Bcrypt
- Nodemailer
- Express Rate Limit
- Validator
- CORS
- Dotenv

### Desplegament

- Vercel per al frontend.
- Railway per al backend i base de dades MySQL.
- GitHub per al control de versions.

---

## 🧱 Arquitectura general

El projecte està dividit en tres parts principals:

```txt
PadelBook/
│
├── backend/          # API REST amb Node.js, Express i MySQL
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── database/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
│
├── frontend/         # Interfície d’usuari amb React + Vite
│   └── src/
│       ├── api/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── routes/
│       └── utils/
│
└── README.md
```

---

## 🔐 Seguretat

El projecte incorpora diferents mesures de seguretat:

- Autenticació amb JWT.
- Contrasenyes encriptades amb bcrypt.
- Middleware de protecció de rutes.
- Middleware de rols.
- Separació de permisos entre usuari, gestor i administrador.
- Rate limiting en rutes sensibles.
- Validació de dades al backend.
- Configuració mitjançant variables d’entorn.
- Protecció de rutes privades al frontend.

---

## 📩 Sistema d’emails

PadelBook inclou un sistema d’emails automàtics mitjançant Nodemailer:

- Email de verificació de compte.
- Email de confirmació de reserva.
- Email de cancel·lació de reserva.
- Emails amb informació de pista, data, hora, preu i estat.

Aquest sistema ajuda a simular un flux real de comunicació entre club i client.

---

## 📊 Panell d’administració

El panell d’administració permet gestionar l’activitat del sistema des d’una interfície centralitzada.

Inclou:

- Resum d’estadístiques.
- Llistat complet de reserves.
- Filtres per data, usuari, pista i estat.
- Detall de reserva.
- Gestió de pistes.
- Bloquejos de manteniment.
- Exportació CSV.
- Logs administratius.
- Gestió d’usuaris i rols.

---

## 🧾 API principal

### Autenticació

| Mètode | Endpoint | Descripció |
|---|---|---|
| POST | `/auth/register` | Registre d’usuari |
| POST | `/auth/login` | Inici de sessió |
| GET | `/auth/verify-email` | Verificació d’email |
| POST | `/auth/resend-verification` | Reenviar verificació |
| GET | `/auth/me` | Obtenir usuari autenticat |
| PUT | `/auth/me` | Actualitzar perfil |
| PUT | `/auth/change-password` | Canviar contrasenya |

### Disponibilitat i pistes

| Mètode | Endpoint | Descripció |
|---|---|---|
| GET | `/availability` | Consultar disponibilitat |
| GET | `/courts` | Obtenir pistes |
| GET | `/timeslots` | Obtenir franges horàries |

### Reserves

| Mètode | Endpoint | Descripció |
|---|---|---|
| GET | `/reservations` | Llistar reserves de l’usuari |
| GET | `/reservations/code/:codi_reserva` | Cercar reserva per codi |
| POST | `/reservations` | Crear reserva |
| DELETE | `/reservations/:id` | Cancel·lar reserva |
| DELETE | `/reservations/:id/permanent` | Eliminar reserva cancel·lada |

### Administració

| Mètode | Endpoint | Descripció |
|---|---|---|
| GET | `/admin/users` | Llistar usuaris |
| GET | `/admin/users/:id` | Detall d’usuari |
| PUT | `/admin/users/:id/role` | Actualitzar rol |
| GET | `/admin/reservations` | Llistar totes les reserves |
| GET | `/admin/reservations/export/csv` | Exportar reserves |
| GET | `/admin/stats/overview` | Estadístiques generals |
| GET | `/admin/stats/by-court` | Estadístiques per pista |
| GET | `/admin/stats/by-timeslot` | Estadístiques per franja |
| GET | `/admin/stats/by-date` | Estadístiques per data |
| GET | `/admin/logs` | Logs administratius |
| POST | `/admin/courts` | Crear pista |
| PUT | `/admin/courts/:id` | Actualitzar pista |
| DELETE | `/admin/courts/:id` | Eliminar pista |
| GET | `/admin/maintenance` | Llistar manteniments |
| POST | `/admin/maintenance` | Crear manteniment |
| PUT | `/admin/maintenance/:id` | Actualitzar manteniment |
| DELETE | `/admin/maintenance/:id` | Eliminar manteniment |

---

## ⚙️ Instal·lació local

### 1. Clonar el repositori

```bash
git clone https://github.com/pereserra-dev/padelbook.git
cd padelbook
```

---

### 2. Instal·lar dependències del backend

```bash
cd backend
npm install
```

Crear un fitxer `.env` dins `backend/`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=padelbook
DB_USER=root
DB_PASSWORD=

JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:5173

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Executar el backend:

```bash
npm run dev
```

---

### 3. Instal·lar dependències del frontend

```bash
cd ../frontend
npm install
```

Crear un fitxer `.env` dins `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

Executar el frontend:

```bash
npm run dev
```

---

## 🗄️ Base de dades

El projecte utilitza MySQL.

Els scripts de base de dades es troben dins:

```txt
backend/src/database/
```

Fitxers principals:

- `schema.sql`
- `seed.sql`
- `migrations.sql`

Ordre recomanat:

```sql
SOURCE schema.sql;
SOURCE seed.sql;
SOURCE migrations.sql;
```

---

## 🧹 Recomanació per mantenir el repositori net

Aquest repositori no hauria d’incloure dependències instal·lades ni variables sensibles.

Fitxer `.gitignore` recomanat a l’arrel:

```gitignore
node_modules/
.env
dist/
build/
*.log
.DS_Store
```

Si `node_modules` o fitxers `.env` ja han estat pujats al repositori:

```bash
git rm -r --cached node_modules
git rm --cached backend/.env
git rm --cached frontend/.env
git add .
git commit -m "chore: netejar dependències i fitxers sensibles del repositori"
git push
```

---

## 📈 Estat actual

- Backend funcional.
- Frontend funcional.
- Autenticació implementada.
- Sistema de reserves implementat.
- Panell d’administració implementat.
- Sistema de rols implementat.
- Emails automàtics implementats.
- Desplegament en producció iniciat.
- Projecte en fase de millora i refinament.

---

## 🔮 Roadmap

Funcionalitats futures plantejades:

- Integració de pagaments reals amb Stripe o PayPal.
- Sistema multi-club.
- Dashboard més avançat per a clubs.
- Notificacions en temps real.
- Aplicació mòbil.
- Sistema de valoracions.
- Factures o tiquets automàtics.
- Calendari visual avançat.
- Millora SEO i rendiment.

---

## 👨‍💻 Autor

**Pere Serra Tugores**  
Junior Full-Stack Developer  
Mallorca, Spain

GitHub: [pereserra-dev](https://github.com/pereserra-dev)

---

## 📄 Llicència

Aquest projecte s’ha desenvolupat amb finalitats educatives i com a projecte de pràctiques/FCT dins el cicle de Desenvolupament d’Aplicacions Web.

