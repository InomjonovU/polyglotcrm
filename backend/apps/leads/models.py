from django.db import models
from django.conf import settings


class LeadStatus(models.TextChoices):
    NEW = 'new', 'Yangi'
    CONTACTED = 'contacted', "Bog'lanildi"
    TRIAL = 'trial', 'Sinov darsi'
    CONVERTED = 'converted', 'O\'quvchi bo\'ldi'
    REJECTED = 'rejected', 'Rad etildi'
    LOST = 'lost', 'Yo\'qotildi'


class LeadSource(models.TextChoices):
    INSTAGRAM = 'instagram', 'Instagram'
    TELEGRAM = 'telegram', 'Telegram'
    WEBSITE = 'website', 'Veb-sayt'
    REFERRAL = 'referral', 'Tanish tavsiyasi'
    WALK_IN = 'walk_in', "Ko'chadan"
    CALL = 'call', 'Qo\'ng\'iroq'
    OTHER = 'other', 'Boshqa'


class Lead(models.Model):
    full_name = models.CharField(max_length=128)
    phone = models.CharField(max_length=20, db_index=True)
    source = models.CharField(max_length=16, choices=LeadSource.choices, default=LeadSource.OTHER)
    interest_course = models.ForeignKey('groups.Course', on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='leads')
    interest_level = models.ForeignKey('groups.Level', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=16, choices=LeadStatus.choices, default=LeadStatus.NEW)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                    blank=True, related_name='assigned_leads')
    notes = models.TextField(blank=True)
    trial_date = models.DateField(null=True, blank=True)
    # Referral — kim taklif qilgan (o'quvchi/o'qituvchi)
    referrer_student = models.ForeignKey('students.Student', on_delete=models.SET_NULL, null=True,
                                         blank=True, related_name='lead_referrals')
    referrer_teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True,
                                         blank=True, related_name='lead_referrals')
    # Agar converted bo'lsa — o'quvchi
    converted_student = models.ForeignKey('students.Student', on_delete=models.SET_NULL, null=True,
                                          blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status'])]

    def __str__(self):
        return f"{self.full_name} ({self.get_status_display()})"


class LeadActivity(models.Model):
    """Lid bilan bog'liq harakat tarixi."""
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    kind = models.CharField(max_length=32, default='note')  # note, call, sms, status_change
    text = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
