from django.db import models
from django.conf import settings
from django.utils import timezone


class BookLanguage(models.TextChoices):
    UZ = 'uz', "O'zbek"
    RU = 'ru', 'Rus'
    EN = 'en', 'Ingliz'
    OTHER = 'other', 'Boshqa'


class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200, blank=True)
    language = models.CharField(max_length=16, choices=BookLanguage.choices, default=BookLanguage.EN)
    course = models.ForeignKey('groups.Course', on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='books')
    level = models.ForeignKey('groups.Level', on_delete=models.SET_NULL, null=True, blank=True)
    category = models.CharField(max_length=64, blank=True, help_text="Grammar, Coursebook, Workbook, ...")
    isbn = models.CharField(max_length=32, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                help_text="Sotuv narxi (so'm)")
    stock = models.IntegerField(default=0, help_text="Omborda qolgan nusxalar soni")
    shelf_location = models.CharField(max_length=64, blank=True, help_text="Masalan: A-3-12")
    description = models.TextField(blank=True)
    cover_url = models.URLField(blank=True)
    file_url = models.URLField(blank=True, help_text="Ebook/PDF havolasi (Google Drive va hk)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title

    @property
    def sold_count(self):
        return self.sales.count()

    @property
    def paid_count(self):
        return self.sales.filter(paid=True).count()


class BookSale(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='sales')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='book_sales')
    price = models.DecimalField(max_digits=12, decimal_places=2,
                                help_text="Sotilgan narx (so'mda)")
    paid = models.BooleanField(default=False, help_text="To'lov holati")
    paid_at = models.DateTimeField(null=True, blank=True)
    sold_at = models.DateTimeField(auto_now_add=True)
    sold_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                blank=True, related_name='books_sold')
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-sold_at']

    def __str__(self):
        return f"{self.book.title} → {self.student}"

    def mark_paid(self, user=None):
        if not self.paid:
            self.paid = True
            self.paid_at = timezone.now()
            self.save(update_fields=['paid', 'paid_at'])
