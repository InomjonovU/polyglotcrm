from django.db import models
from django.conf import settings


class TeacherType(models.TextChoices):
    MAIN = 'main', 'Asosiy'
    SUPPORT = 'support', 'Yordamchi (support)'


class Teacher(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name='teacher_profile')
    type = models.CharField(max_length=16, choices=TeacherType.choices, default=TeacherType.MAIN)
    percent = models.DecimalField(max_digits=5, decimal_places=2, default=30,
                                  help_text="O'qituvchining ulushi (%)")
    hired_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.user.full_name

    @property
    def is_support(self):
        return self.type == TeacherType.SUPPORT
