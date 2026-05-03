# WMT Full Stack Mobile App

WMT is a full-stack mobile application built with:

- Frontend: React Native (Expo)
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)

## Project Structure

```text
WMT/
├── mobile/
│   ├── screens/
│   ├── components/
│   ├── navigation/
│   ├── services/
│   ├── assets/
│   └── App.js
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── uploads/
│   └── server.js
├── database/
├── .env
├── package.json
└── README.md
```

## Run Backend

```bash
cd server
npm install
npm run dev
```

## Run Mobile App

```bash
cd mobile
npm install
npm start
```

## Notes

- All MySQL/SQL-based backend logic has been removed.
- API uses MongoDB through Mongoose models and controllers.
- Mobile app consumes backend REST APIs via `mobile/services/api.js`.
