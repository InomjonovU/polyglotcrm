from django.db import models


class GradeType(models.TextChoices):
    LESSON = 'lesson', 'Dars bahosi'
    TEST = 'test', 'Test'
    EXAM = 'exam', 'Imtihon'


class Grade(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='grades')
    group = models.ForeignKey('groups.Group', on_delete=models.SET_NULL, null=True, related_name='grades')
    type = models.CharField(max_length=16, choices=GradeType.choices, default=GradeType.LESSON)
    value = models.IntegerField(help_text='1-10')
    title = models.CharField(max_length=128, blank=True)
    note = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    given_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
