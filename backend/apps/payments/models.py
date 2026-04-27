import secrets
import string
from django.db import models
from django.conf import settings


def _gen_receipt_code(n=8):
    """Qisqa unikal chek kodi (0/O/1/I/L chetlashtirilgan)."""
    alphabet = ''.join(c for c in (string.ascii_uppercase + string.digits)
                       if c not in 'O0I1L')
    return ''.join(secrets.choice(alphabet) for _ in range(n))


class PaymentMethod(models.TextChoices):
    CASH = 'cash', 'Naqd'
    CARD = 'card', 'Plastik'
    TRANSFER = 'transfer', 'Bank o\'tkazma'


class MonthlyCharge(models.Model):
    """Har oy har o'quvchi uchun hisoblangan to'lov (invoice)."""
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='charges')
    group = models.ForeignKey('groups.Group', on_delete=models.SET_NULL, null=True)
    year = models.IntegerField()
    month = models.IntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # chegirma va muzlatish hisobidan
    original_amount = models.DecimalField(max_digits=12, decimal_places=2)  # chegirmasiz
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    active_days = models.IntegerField(default=0)
    total_days = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'year', 'month', 'group')

    @property
    def paid_total(self):
        return sum((p.amount for p in self.payments.all()), 0)

    @property
    def balance(self):
        return self.amount - self.paid_total


class Payment(models.Model):
    charge = models.ForeignKey(MonthlyCharge, on_delete=models.CASCADE, related_name='payments',
                               null=True, blank=True)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=16, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    paid_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    # Har bir to'lov o'z chek kodiga ega — qisqa, unikal, uppercase
    receipt_code = models.CharField(max_length=12, unique=True, db_index=True, blank=True)

    class Meta:
        ordering = ['-paid_at']

    def save(self, *args, **kwargs):
        if not self.receipt_code:
            for _ in range(10):
                c = _gen_receipt_code(8)
                if not Payment.objects.filter(receipt_code=c).exists():
                    self.receipt_code = c
                    break
            else:
                self.receipt_code = _gen_receipt_code(10)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.receipt_code} — {self.amount}"
