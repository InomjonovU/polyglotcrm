from django.db import models


class AttendanceStatus(models.TextChoices):
    PRESENT = 'present', 'Keldi'
    ABSENT = 'absent', 'Kelmadi'
    LATE = 'late', 'Kech qoldi'


class Attendance(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='attendances')
    group = models.ForeignKey('groups.Group', on_delete=models.SET_NULL, null=True, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=16, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    marked_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'group', 'date')
        indexes = [models.Index(fields=['group', 'date'])]
