from django.db import models


class SmsTemplate(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    body = models.TextField(help_text="Placeholder'lar: {name}, {amount}, {month} va h.k.")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} — {self.name}"


class SmsSettings(models.Model):
    """SMS provider credentials (singleton)."""
    provider = models.CharField(max_length=32, default='eskiz')
    eskiz_email = models.CharField(max_length=128, blank=True)
    eskiz_password = models.CharField(max_length=128, blank=True)
    eskiz_sender = models.CharField(max_length=32, default='4546')
    is_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'SMS sozlamalari'

    @classmethod
    def load(cls):
        obj = cls.objects.first()
        if not obj:
            obj = cls.objects.create()
        return obj


class SmsLog(models.Model):
    phone = models.CharField(max_length=20)
    message = models.TextField()
    status = models.CharField(max_length=16, default='pending',
                              choices=[('pending', 'Kutilmoqda'),
                                       ('sent', 'Yuborildi'),
                                       ('failed', 'Xatolik')])
    attempts = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
