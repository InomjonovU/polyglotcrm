from django.db import models


class Homework(models.Model):
    """O'qituvchi tomonidan berilgan uyga vazifa.

    Topshirish (submission) tizimi YO'Q - vazifa shunchaki ko'rsatiladi va kerak bo'lsa
    fayl/havola biriktiriladi. O'quvchi o'qib, mustaqil bajaradi."""
    group = models.ForeignKey('groups.Group', on_delete=models.CASCADE, related_name='homeworks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    attachment = models.FileField(upload_to='homework/', blank=True, null=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True,
                                   related_name='homeworks_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date', '-created_at']
        indexes = [models.Index(fields=['group', '-due_date'])]

    def __str__(self):
        return f"{self.title} ({self.group.name})"
