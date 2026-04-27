from django.db import models


class Advance(models.Model):
    """O'qituvchiga berilgan avans."""
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, related_name='advances')
    year = models.IntegerField()
    month = models.IntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    given_at = models.DateTimeField(auto_now_add=True)
    given_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-given_at']
        indexes = [models.Index(fields=['teacher', 'year', 'month'])]


class SalaryRecord(models.Model):
    """Yakunlangan oy uchun maosh yozuvi."""
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, related_name='salary_records')
    year = models.IntegerField()
    month = models.IntegerField()
    calculated_amount = models.DecimalField(max_digits=12, decimal_places=2)
    advances_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_finalized = models.BooleanField(default=False)
    finalized_at = models.DateTimeField(null=True, blank=True)
    finalized_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    breakdown = models.JSONField(default=list, blank=True)  # [{group, students_count, fee, amount}]

    class Meta:
        unique_together = ('teacher', 'year', 'month')
        ordering = ['-year', '-month']


class AdvanceRequest(models.Model):
    """O'qituvchining avans so'rovi."""
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, related_name='advance_requests')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, default='pending',
                              choices=[('pending', 'Kutilmoqda'),
                                       ('approved', 'Tasdiqlangan'),
                                       ('rejected', 'Rad etildi')])
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
