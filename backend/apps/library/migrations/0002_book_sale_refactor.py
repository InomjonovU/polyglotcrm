# Generated migration: convert library from loans to sales
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0001_initial'),
        ('students', '0006_student_parent_phone_parent_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Drop the old BookLoan model entirely
        migrations.DeleteModel(
            name='BookLoan',
        ),
        # 2. Replace total_copies with stock + price on Book
        migrations.RemoveField(
            model_name='book',
            name='total_copies',
        ),
        migrations.AddField(
            model_name='book',
            name='price',
            field=models.DecimalField(decimal_places=2, default=0,
                                      help_text="Sotuv narxi (so'm)", max_digits=12),
        ),
        migrations.AddField(
            model_name='book',
            name='stock',
            field=models.IntegerField(default=0, help_text='Omborda qolgan nusxalar soni'),
        ),
        # 3. Create the BookSale model
        migrations.CreateModel(
            name='BookSale',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.DecimalField(decimal_places=2, help_text="Sotilgan narx (so'mda)", max_digits=12)),
                ('paid', models.BooleanField(default=False, help_text="To'lov holati")),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('sold_at', models.DateTimeField(auto_now_add=True)),
                ('note', models.CharField(blank=True, max_length=255)),
                ('book', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sales', to='library.book')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='book_sales', to='students.student')),
                ('sold_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='books_sold', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-sold_at'],
            },
        ),
    ]
