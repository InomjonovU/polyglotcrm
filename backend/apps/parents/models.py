from django.db import models
from django.conf import settings


class Relation(models.TextChoices):
    FATHER = 'father', 'Ota'
    MOTHER = 'mother', 'Ona'
    GUARDIAN = 'guardian', 'Vasiy'
    OTHER = 'other', 'Boshqa'


class Parent(models.Model):
    """Ota-ona profili. Login qilish uchun User ixtiyoriy — telefon asosiy.
    Bir ota-ona bir nechta o'quvchiga bog'lanishi mumkin (M2M)."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                blank=True, related_name='parent_profile')
    full_name = models.CharField(max_length=128)
    phone = models.CharField(max_length=20, db_index=True)
    relation = models.CharField(max_length=16, choices=Relation.choices, default=Relation.OTHER)
    students = models.ManyToManyField('students.Student', related_name='parents', blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} ({self.get_relation_display()})"
