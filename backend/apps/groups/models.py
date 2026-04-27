from django.db import models


class Course(models.Model):
    name = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Level(models.Model):
    name = models.CharField(max_length=64, unique=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class WeekdayPattern(models.TextChoices):
    MWF = 'mwf', 'Dush-Chor-Juma'
    TTS = 'tts', 'Sesh-Pay-Shan'
    DAILY = 'daily', 'Har kuni'
    WEEKEND = 'weekend', 'Shan-Yak'


class Group(models.Model):
    name = models.CharField(max_length=128)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='groups')
    level = models.ForeignKey(Level, on_delete=models.PROTECT, related_name='groups', null=True, blank=True)
    weekday_pattern = models.CharField(max_length=16, choices=WeekdayPattern.choices, default=WeekdayPattern.MWF)
    lesson_time = models.TimeField()
    start_date = models.DateField(null=True, blank=True,
                                  help_text="Guruhning birinchi dars sanasi")
    monthly_fee = models.DecimalField(max_digits=12, decimal_places=2)
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, related_name='groups',
                                null=True, blank=True)
    support_teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL,
                                        related_name='support_groups', null=True, blank=True,
                                        help_text="Yordamchi (support) o'qituvchi")
    max_students = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def active_students_count(self):
        from apps.students.models import StudentStatus
        return self.enrolled_students.filter(status=StudentStatus.ACTIVE).count()


class GroupScheduleChange(models.Model):
    """Dars vaqti o'zgarishi tarixi."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='schedule_changes')
    old_pattern = models.CharField(max_length=16)
    old_time = models.TimeField()
    new_pattern = models.CharField(max_length=16)
    new_time = models.TimeField()
    effective_date = models.DateField()
    changed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LessonCancellation(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='cancellations')
    date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'date')


class GroupEnrollment(models.Model):
    """
    O'quvchining guruhga qo'shilgan sanasini kuzatish.
    Student.groups M2M bilan bir vaqtda yaratiladi (signal/view orqali).
    """
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE,
                                related_name='enrollments')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateField(help_text="Guruhga qo'shilgan sana")
    left_at = models.DateField(null=True, blank=True, help_text="Guruhdan chiqqan sana")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['student', 'group']),
            models.Index(fields=['group', 'enrolled_at']),
        ]

    def __str__(self):
        return f"{self.student} → {self.group} ({self.enrolled_at})"
