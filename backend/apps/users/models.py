from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    TEACHER = 'teacher', "O'qituvchi"
    STUDENT = 'student', "O'quvchi"
    PARENT = 'parent', "Ota-ona"


class User(AbstractUser):
    """
    Uchala rol ham shu User orqali kiradi.
    - Admin: username + parol
    - O'qituvchi / O'quvchi: telefon raqam username sifatida + parol
    """
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.ADMIN)
    phone = models.CharField(max_length=20, blank=True, db_index=True)
    first_name = models.CharField(max_length=64, blank=True)
    last_name = models.CharField(max_length=64, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.username

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username


class LoginAttempt(models.Model):
    """5 marta noto'g'ri urinishda 15 daqiqaga bloklash."""
    identifier = models.CharField(max_length=128, db_index=True)  # username/phone
    ip = models.GenericIPAddressField(null=True, blank=True)
    attempts = models.IntegerField(default=0)
    blocked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['identifier', 'ip'])]
