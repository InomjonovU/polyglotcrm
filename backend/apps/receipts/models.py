import secrets
import string
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


def _gen_code(n=6):
    """6 belgili qisqa kod: raqam + katta harf (O, 0, I, 1 chetlashtirilgan)."""
    alphabet = ''.join(c for c in (string.ascii_uppercase + string.digits)
                       if c not in 'O0I1')
    return ''.join(secrets.choice(alphabet) for _ in range(n))


class Receipt(models.Model):
    """
    Chek (receipt). Har kim yarata oladi, qisqa kod orqali tekshiriladi.
    """
    code = models.CharField(max_length=12, unique=True, db_index=True)
    title = models.CharField(max_length=200, help_text="Chek nomi / izoh")
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="UZS")
    buyer_name = models.CharField(max_length=128, blank=True, help_text="Kim uchun (ixtiyoriy)")
    buyer_phone = models.CharField(max_length=20, blank=True)
    note = models.TextField(blank=True)
    # Yaratgan — autentifikatsiya shart emas, null bo'lishi mumkin
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='receipts')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.code:
            # Unikal kod topilguncha qayta-qayta urinamiz
            for _ in range(10):
                c = _gen_code(6)
                if not Receipt.objects.filter(code=c).exists():
                    self.code = c
                    break
            else:
                # Juda kam ehtimol: 7 belgiga kengaytiramiz
                self.code = _gen_code(7)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} — {self.title}"


class ReceiptItem(models.Model):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    @property
    def subtotal(self):
        return (self.quantity or Decimal(0)) * (self.unit_price or Decimal(0))

    def __str__(self):
        return f"{self.name} ×{self.quantity}"
