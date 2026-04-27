"""
O'qituvchi maosh hisoblash:
  Guruh_maoshi = Guruh_narxi × Faol_o'quvchilar × Foiz%
  - Muzlatilgan o'quvchi CHIQARILADI
  - Chegirmali o'quvchida CHEGIRMADAN OLDINGI narx ishlatiladi
  - To'lagan/to'lamagan — FARQI YO'Q
  - Endi bir o'quvchi bir nechta guruhda bo'lishi mumkin — har bir guruh
    faqat o'z enrolled_students'ini sanaydi
"""
from decimal import Decimal
from django.db.models import Sum
from apps.students.models import StudentStatus
from .models import Advance, SalaryRecord


def calculate_teacher_salary(teacher, year, month):
    """Bitta o'qituvchining oylik maoshini va breakdown'ini hisoblaydi."""
    groups = teacher.groups.filter(is_active=True)
    percent = Decimal(teacher.percent) / Decimal(100)

    breakdown = []
    total = Decimal(0)

    for group in groups:
        active_students = group.enrolled_students.filter(status=StudentStatus.ACTIVE).count()
        group_income = Decimal(group.monthly_fee) * active_students
        group_salary = (group_income * percent).quantize(Decimal('0.01'))
        total += group_salary
        breakdown.append({
            'group_id': group.id,
            'group_name': group.name,
            'monthly_fee': float(group.monthly_fee),
            'active_students': active_students,
            'income': float(group_income),
            'percent': float(teacher.percent),
            'salary': float(group_salary),
        })

    advances_total = Advance.objects.filter(
        teacher=teacher, year=year, month=month
    ).aggregate(s=Sum('amount'))['s'] or Decimal(0)

    return {
        'calculated_amount': total,
        'advances_total': advances_total,
        'payable': total - advances_total,
        'breakdown': breakdown,
    }


def finalize_month(teacher, year, month, user=None):
    data = calculate_teacher_salary(teacher, year, month)
    record, _ = SalaryRecord.objects.update_or_create(
        teacher=teacher, year=year, month=month,
        defaults={
            'calculated_amount': data['calculated_amount'],
            'advances_total': data['advances_total'],
            'paid_amount': data['payable'],
            'is_finalized': True,
            'breakdown': data['breakdown'],
            'finalized_by': user,
        }
    )
    from django.utils import timezone
    record.finalized_at = timezone.now()
    record.save()
    return record
