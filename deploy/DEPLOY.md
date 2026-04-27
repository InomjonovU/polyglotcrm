# PolyglotLC — Server'ga yuklash yo'riqnomasi

Ubuntu 24.04 / 2 vCPU / 4 GB RAM / 50 GB NVMe uchun.

Bu hujjat: bo'sh server → ishlovchi CRM, ~30-45 daqiqada.

---

## 0) Tayyorgarlik (lokal kompyuterda)

### Domain'ni server IP'ga ko'rsatish

DNS panelingizda (Cloudflare yoki domen registratoringizda):
```
A    crm.example.uz       → SERVER_IP
A    www.crm.example.uz   → SERVER_IP
```
DNS yangilanishi 5-30 daqiqa olishi mumkin.

### Lokal frontend build (variant A — tez)

```powershell
cd D:\polyglot_crm\frontend
npm run build
```

`frontend/dist/` papka paydo bo'ladi. Buni keyin serverga yuboramiz.

---

## 1) Server'ga ulanish

```bash
ssh root@SERVER_IP
```

Provayder bergan parolni kiriting. Birinchi marta `apt update && apt upgrade -y` qilib qo'ying:

```bash
apt update && apt upgrade -y
```

## 2) Tizim foydalanuvchisi (root bilan ishlamaymiz)

```bash
adduser polyglot
usermod -aG sudo polyglot
```

SSH key qo'shish (lokal kompyuterdan):
```powershell
# Lokal Windows'da PowerShell:
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@SERVER_IP "mkdir -p /home/polyglot/.ssh && cat >> /home/polyglot/.ssh/authorized_keys && chown -R polyglot:polyglot /home/polyglot/.ssh && chmod 700 /home/polyglot/.ssh && chmod 600 /home/polyglot/.ssh/authorized_keys"
```

Endi `ssh polyglot@SERVER_IP` bilan ulanish ishlashi kerak.

## 3) Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 4) Asosiy paketlar

```bash
sudo apt install -y python3.12-venv python3-pip \
    postgresql postgresql-contrib \
    redis-server \
    nginx certbot python3-certbot-nginx \
    git curl unzip build-essential libpq-dev
```

Node.js (frontend serverda build qilmoqchi bo'lsangiz):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 5) PostgreSQL — DB va foydalanuvchi

```bash
sudo -u postgres psql
```

PSQL ichida (parolni kuchli qiling):
```sql
CREATE USER polyglot WITH PASSWORD 'STRONG_DB_PASSWORD_HERE';
CREATE DATABASE polyglot_crm OWNER polyglot;
GRANT ALL PRIVILEGES ON DATABASE polyglot_crm TO polyglot;
\q
```

Tekshirish:
```bash
PGPASSWORD='STRONG_DB_PASSWORD_HERE' psql -U polyglot -h 127.0.0.1 -d polyglot_crm -c "SELECT 1;"
```

## 6) Loyiha kodi serverga

### Variant A — Git orqali (eng oson, agar repository bor bo'lsa)

```bash
sudo mkdir -p /opt/polyglot_crm
sudo chown polyglot:polyglot /opt/polyglot_crm
cd /opt
sudo -u polyglot git clone https://github.com/USERNAME/polyglot_crm.git polyglot_crm
```

### Variant B — Lokal'dan rsync/scp (git'siz)

Lokal Windows PowerShell'da:
```powershell
# Eslatma: env/ va node_modules/ yubormaymiz
cd D:\polyglot_crm
# Avval frontend build qilingan bo'lsin
# `frontend/dist/` ham yuboriladi

# WSL yoki Git Bash bilan rsync ishlatish mumkin. Yoki SCP:
scp -r backend deploy frontend\dist polyglot@SERVER_IP:/tmp/upload/
```

Server'da:
```bash
sudo mkdir -p /opt/polyglot_crm/backend /opt/polyglot_crm/frontend/dist /opt/polyglot_crm/deploy
sudo cp -r /tmp/upload/backend/* /opt/polyglot_crm/backend/
sudo cp -r /tmp/upload/dist/* /opt/polyglot_crm/frontend/dist/
sudo cp -r /tmp/upload/deploy/* /opt/polyglot_crm/deploy/
sudo chown -R polyglot:polyglot /opt/polyglot_crm
```

## 7) Backend — venv va paketlar

```bash
cd /opt/polyglot_crm/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 8) `.env` faylini yaratish

```bash
cp /opt/polyglot_crm/deploy/.env.production.example /opt/polyglot_crm/backend/.env
nano /opt/polyglot_crm/backend/.env
```

Quyidagilarni o'zgartiring:
- `SECRET_KEY` — random uzun string. Yaratish:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(50))"
  ```
- `ALLOWED_HOSTS` — `crm.example.uz,www.crm.example.uz`
- `FRONTEND_URL` — `https://crm.example.uz`
- `CSRF_TRUSTED_ORIGINS` — `https://crm.example.uz,https://www.crm.example.uz`
- `DB_PASSWORD` — yuqorida o'rnatgan parolingiz
- `ESKIZ_*` — agar SMS yuborilsa to'ldiring, aks holda `SMS_ENABLED=False`

`.env` huquqlari:
```bash
chmod 600 /opt/polyglot_crm/backend/.env
```

## 9) Migratsiya, superuser, static

```bash
cd /opt/polyglot_crm/backend
source venv/bin/activate

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

`createsuperuser` so'raydi: username, email (bo'sh qoldirish mumkin), parol.

## 10) Frontend (agar serverda build qilmoqchi bo'lsangiz)

> Agar lokal'da `npm run build` qilib `dist/`ni serverga yuborgan bo'lsangiz, bu qadamni o'tkazib yuboring.

```bash
cd /opt/polyglot_crm/frontend
npm install
npm run build
```

## 11) Log papkasi va systemd service'lar

```bash
sudo mkdir -p /var/log/polyglot
sudo chown polyglot:polyglot /var/log/polyglot

sudo cp /opt/polyglot_crm/deploy/polyglot-gunicorn.service /etc/systemd/system/
sudo cp /opt/polyglot_crm/deploy/polyglot-celery.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now polyglot-gunicorn
sudo systemctl enable --now polyglot-celery
```

Tekshirish:
```bash
sudo systemctl status polyglot-gunicorn
sudo systemctl status polyglot-celery
curl -I http://127.0.0.1:8000/api/   # 404 yoki 401 — bu normal, gunicorn ishlayapti
```

Agar xato bo'lsa:
```bash
sudo journalctl -u polyglot-gunicorn -n 50
tail -f /var/log/polyglot/error.log
```

## 12) Nginx

```bash
sudo cp /opt/polyglot_crm/deploy/nginx.conf /etc/nginx/sites-available/polyglot_crm
sudo nano /etc/nginx/sites-available/polyglot_crm   # crm.example.uz ni o'z domenga almashtiring
sudo ln -s /etc/nginx/sites-available/polyglot_crm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Endi `http://crm.example.uz` ochilsa, brauzer "Not Secure" bilan ham bo'lsa frontend ko'rsatishi kerak.

## 13) HTTPS (Let's Encrypt)

```bash
sudo mkdir -p /var/www/certbot
sudo certbot --nginx -d crm.example.uz -d www.crm.example.uz \
    --redirect --agree-tos --email YOUR_EMAIL@example.com
```

Certbot Nginx config'ini avtomatik tahrirlaydi. Sertifikat har 90 kunda avtomatik yangilanadi (cron orqali, certbot o'rnatgan).

Endi `https://crm.example.uz` ishlashi kerak.

## 14) Backup (avtomatik)

```bash
sudo cp /opt/polyglot_crm/deploy/backup.sh /opt/polyglot_crm/backup.sh
sudo chmod +x /opt/polyglot_crm/backup.sh
sudo mkdir -p /var/backups/polyglot
sudo chown polyglot:polyglot /var/backups/polyglot
```

Cron qo'shish:
```bash
sudo crontab -u polyglot -e
```

Faylga qo'shing:
```cron
0 3 * * * /opt/polyglot_crm/backup.sh >> /var/log/polyglot/backup.log 2>&1
```

Bu har kuni soat 03:00 da backup oladi va 14 kundan eskisini o'chiradi.

Birinchi marta qo'lda sinash:
```bash
sudo -u polyglot /opt/polyglot_crm/backup.sh
ls -lh /var/backups/polyglot/
```

## 15) Yakuniy tekshirish

| Test | Buyruq | Kutilgan natija |
|------|--------|-----------------|
| Frontend | brauzer'da `https://crm.example.uz` | Login sahifa chiqadi |
| API | `curl https://crm.example.uz/api/auth/me/` | `{"detail":"Authentication credentials..."}` (401) |
| Admin | `https://crm.example.uz/admin/` | Django admin login |
| HTTPS | brauzerda yashil qulflik | OK |
| Postgres | `sudo systemctl status postgresql` | active (running) |
| Redis | `sudo systemctl status redis-server` | active |
| Gunicorn | `sudo systemctl status polyglot-gunicorn` | active |
| Celery | `sudo systemctl status polyglot-celery` | active |
| Nginx | `sudo systemctl status nginx` | active |

---

## Yangi versiyani deploy qilish (kelajakda)

Lokal'da o'zgartirishlar tayyor bo'lganda:

```bash
# Server'da:
cd /opt/polyglot_crm

# Kodni yangilash
sudo -u polyglot git pull              # yoki rsync orqali yangilash

# Backend bog'liqliklar va migratsiyalar
cd /opt/polyglot_crm/backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend qayta build (yoki lokal'dan dist/ ni qaytadan yuborish)
cd /opt/polyglot_crm/frontend
npm install
npm run build

# Service'larni qayta yuklash
sudo systemctl restart polyglot-gunicorn
sudo systemctl restart polyglot-celery
```

Nginx qayta yuklashga shart emas (faqat config o'zgargan bo'lsa).

---

## Muammolar yuz bersa

### "502 Bad Gateway"
Gunicorn ishlamayapti:
```bash
sudo systemctl status polyglot-gunicorn
sudo journalctl -u polyglot-gunicorn -n 100
tail -100 /var/log/polyglot/error.log
```

### Login ishlamaydi
- `.env` da `ALLOWED_HOSTS` to'g'rimi?
- `CSRF_TRUSTED_ORIGINS` qo'shilganmi?
- Brauzer console'da xato bormi?

### CSS/JS yuklanmaydi
```bash
python manage.py collectstatic --noinput
sudo systemctl reload nginx
```

### SMS yuborilmayapti
- `SMS_ENABLED=True` mi?
- Eskiz hisobida pul bormi?
- Celery ishlayaptimi: `sudo systemctl status polyglot-celery`?

### Disk to'lib ketmasligi uchun
```bash
df -h                           # umumiy disk
du -sh /var/log/polyglot/*      # logs
du -sh /var/backups/polyglot    # backups
sudo journalctl --vacuum-time=7d   # journalctl loglarini tozalash
```
