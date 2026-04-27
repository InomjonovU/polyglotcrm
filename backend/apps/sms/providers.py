"""SMS provayder integratsiyasi (Eskiz.uz)."""
import requests
from django.conf import settings


class EskizProvider:
    BASE = 'https://notify.eskiz.uz/api'
    _token = None

    @classmethod
    def _auth(cls):
        if cls._token:
            return cls._token
        resp = requests.post(f"{cls.BASE}/auth/login", data={
            'email': settings.ESKIZ_EMAIL,
            'password': settings.ESKIZ_PASSWORD,
        }, timeout=10)
        resp.raise_for_status()
        cls._token = resp.json()['data']['token']
        return cls._token

    @classmethod
    def send(cls, phone, message):
        token = cls._auth()
        resp = requests.post(f"{cls.BASE}/message/sms/send", headers={
            'Authorization': f'Bearer {token}',
        }, data={
            'mobile_phone': phone.lstrip('+'),
            'message': message,
            'from': settings.ESKIZ_SENDER,
        }, timeout=15)
        resp.raise_for_status()
        return resp.json()


def send_via_provider(phone, message):
    if settings.SMS_PROVIDER == 'eskiz':
        return EskizProvider.send(phone, message)
    raise NotImplementedError(f"Unknown provider {settings.SMS_PROVIDER}")
