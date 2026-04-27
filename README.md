# PolyglotLC CRM

O'quv markaz boshqaruv tizimi — Django + React.

## Struktura

```
polyglot_crm/
├── backend/     # Django + DRF + JWT
└── frontend/    # React + Vite + Tailwind
```

## Backend ishga tushirish

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed        # Test ma'lumotlar va admin
python manage.py runserver
```

Default admin: `admin` / `admin123`

## Frontend ishga tushirish

```bash
cd frontend
npm install
npm run dev
```

Ochiladi: http://localhost:5173

## Rollar

- **Admin** — username + parol bilan kiradi
- **O'qituvchi** — telefon + parol
- **O'quvchi** — telefon + parol

## Stack

Backend: Django 5, DRF, SimpleJWT, Celery, Redis, PostgreSQL (yoki SQLite dev uchun)
Frontend: React 18, Vite, React Router, Tailwind, React Query, Recharts
SMS: Eskiz.uz (yoki Play Mobile)
