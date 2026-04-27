from django.db import models
from django.conf import settings


class StudentStatus(models.TextChoices):
    ACTIVE = 'active', 'Faol'
    FROZEN = 'frozen', 'Muzlatilgan'
    ARCHIVED = 'archived', 'Arxiv'


class Student(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name='student_profile')
    # Asosiy guruh (ko'rsatish uchun, birinchi qo'shilgan guruh)
    group = models.ForeignKey('groups.Group', on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='primary_students')
    # Bir nechta guruhga qo'shilish mumkin
    groups = models.ManyToManyField('groups.Group', related_name='enrolled_students', blank=True)
    status = models.CharField(max_length=16, choices=StudentStatus.choices, default=StudentStatus.ACTIVE)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    joined_date = models.DateField(auto_now_add=True)
    archived_reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    # Referral — kim taklif qildi
    referrer_student = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='referrals')
    referrer_teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True,
                                         blank=True, related_name='referrals')
    referrer_source = models.CharField(max_length=64, blank=True,
                                       help_text="Tashqi manba: Instagram, Telegram, reklama va hk.")
    # Ota-ona — alohida Parent jadvali emas, faqat 2 ta maydon
    parent_phone = models.CharField(max_length=20, blank=True, db_index=True,
                                    help_text="Ota-ona telefon raqami (login uchun)")
    parent_name = models.CharField(max_length=128, blank=True,
                                   help_text="Ota-ona to'liq ismi (ixtiyoriy)")

    def __str__(self):
        return self.user.full_name

    @property
    def is_active(self):
        return self.status == StudentStatus.ACTIVE

    @property
    def current_freeze(self):
        return self.freeze_history.filter(end_date__gte=models.functions.Now()).order_by('-start_date').first()


class FreezeRecord(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='freeze_history')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # Tugaganligi flag (auto_unfreeze vazifasi uchun)
    released = models.BooleanField(default=False)


class GroupTransfer(models.Model):
    """Guruh o'tkazish tarixi."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='transfers')
    old_group = models.ForeignKey('groups.Group', on_delete=models.SET_NULL, null=True, related_name='+')
    new_group = models.ForeignKey('groups.Group', on_delete=models.SET_NULL, null=True, related_name='+')
    transfer_date = models.DateField()
    old_group_fee_charged = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    new_group_fee_charged = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DiscountLog(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='discount_logs')
    old_percent = models.DecimalField(max_digits=5, decimal_places=2)
    new_percent = models.DecimalField(max_digits=5, decimal_places=2)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
