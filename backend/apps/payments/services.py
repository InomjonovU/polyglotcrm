"""To'lov hisoblash servisi — oylik charge yaratish.

Endi bir o'quvchi bir nechta guruhda bo'lishi mumkin — har bir guruh uchun
alohida MonthlyCharge yaratiladi.
"""
import calendar
from decimal import Decimal
from datetime import date
from django.db import transaction
from apps.students.models import Student, StudentStatus
from .models import MonthlyCharge


def calculate_active_days(student, year, month):
    """Muzlatilgan kunlarni chiqarib, faol kunlarni qaytaradi."""
    days_in_month = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)

    frozen_days = 0
    for fr in student.freeze_history.all():
        overlap_start = max(fr.start_date, month_start)
        overlap_end = min(fr.end_date, month_end)
        if overlap_start <= overlap_end:
            frozen_days += (overlap_end - overlap_start).days + 1

    return max(0, days_in_month - frozen_days), days_in_month


@transaction.atomic
def generate_monthly_charges(year, month):
    """Har faol/muzlatilgan o'quvchining har bir guruhi uchun MonthlyCharge yaratadi."""
    created = 0
    students = Student.objects.prefetch_related('groups').filter(
        status__in=[StudentStatus.ACTIVE, StudentStatus.FROZEN]
    )
    for student in students:
        student_groups = list(student.groups.all())
        if not student_groups:
            continue

        active_days, total_days = calculate_active_days(student, year, month)
        if active_days == 0:
            continue

        for group in student_groups:
            if MonthlyCharge.objects.filter(
                student=student, group=group, year=year, month=month
            ).exists():
                continue

            original = Decimal(group.monthly_fee)
            discount = student.discount_percent or Decimal(0)
            after_discount = original * (Decimal(100) - discount) / Decimal(100)
            if active_days < total_days:
                after_discount = (after_discount * active_days / total_days)
            amount = after_discount.quantize(Decimal('0.01'))

            MonthlyCharge.objects.create(
                student=student,
                group=group,
                year=year,
                month=month,
                amount=amount,
                original_amount=original,
                discount_percent=discount,
                active_days=active_days,
                total_days=total_days,
            )
            created += 1
    return created


def ensure_current_month_charges():
    """
    Oy almashganda avtomatik oylik hisoblarni yaratadi (idempotent).
    Agar joriy oy uchun hech qanday MonthlyCharge yo'q bo'lsa — generate qiladi.
    Admin dashboard yoki charges endpointi chaqirilganda ishga tushadi.
    """
    today = date.today()
    exists = MonthlyCharge.objects.filter(year=today.year, month=today.month).exists()
    if exists:
        return 0
    return generate_monthly_charges(today.year, today.month)


def apply_payment(payment, group_id=None):
    """To'lovni mos keladigan charge'ga bog'lash.

    Agar `group_id` ko'rsatilgan bo'lsa — shu guruh uchun joriy oylik
    MonthlyCharge'ga bog'lanadi (agar yo'q bo'lsa, generate qilib oladi).
    Aks holda balansi eng ko'p qoldiq bo'lgan charge tanlanadi.
    """
    if payment.charge:
        return payment
    today = date.today()

    if group_id:
        # Aniq guruh ko'rsatilgan — shu guruhning charge'ini topamiz/yaratamiz
        try:
            charge = MonthlyCharge.objects.get(
                student=payment.student, group_id=group_id,
                year=today.year, month=today.month,
            )
        except MonthlyCharge.DoesNotExist:
            # Avtomatik generatsiya — keyin qaytadan urinib ko'ramiz
            try:
                ensure_current_month_charges()
            except Exception:
                pass
            charge = MonthlyCharge.objects.filter(
                student=payment.student, group_id=group_id,
                year=today.year, month=today.month,
            ).first()
        if charge:
            payment.charge = charge
            payment.save()
        return payment

    # group ko'rsatilmagan — balansi eng ko'p qoldiq bo'lgan charge'ga bog'lash
    charges = MonthlyCharge.objects.filter(
        student=payment.student, year=today.year, month=today.month
    )
    best = None
    best_balance = Decimal(0)
    for c in charges:
        b = c.balance
        if b > best_balance:
            best = c
            best_balance = b
    if best:
        payment.charge = best
        payment.save()
    return payment
