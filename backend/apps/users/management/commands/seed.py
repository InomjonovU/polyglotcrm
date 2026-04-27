from datetime import time
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import User, Role
from apps.teachers.models import Teacher
from apps.students.models import Student
from apps.groups.models import Course, Level, Group, WeekdayPattern
from apps.sms.models import SmsTemplate


TEMPLATES = [
    ('welcome', 'Xush kelibsiz', "Assalomu alaykum, {name}! {center} ga xush kelibsiz. Login: {phone}, Parol: {password}"),
    ('payment_reminder', "To'lov eslatmasi", "Assalomu alaykum, {name}! {month} uchun to'lov: {amount} so'm."),
    ('payment_overdue', 'Qarz eslatmasi', "{name}, to'lov hali amalga oshmagan: {amount} so'm."),
    ('payment_received', "To'lov qabul qilindi", "{name}, {amount} so'm to'lovingiz qabul qilindi. Rahmat!"),
    ('schedule_change', "Vaqt o'zgardi", "Diqqat! {group} guruhining dars vaqti o'zgardi."),
    ('lesson_cancelled', 'Dars bekor', "{date} kuni {group} guruhining darsi bo'lmaydi."),
    ('freeze_confirmed', 'Muzlatish', "{name}, o'qishingiz {start} dan {end} gacha muzlatildi."),
    ('group_transferred', "Guruh o'zgardi", "{name}, siz {old} dan {new} ga o'tkazildingiz."),
]


class Command(BaseCommand):
    help = "Test ma'lumotlar va admin yaratadi"

    @transaction.atomic
    def handle(self, *args, **options):
        # Admin
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_superuser(
                username='admin', password='admin123',
                role=Role.ADMIN, first_name='Super', last_name='Admin',
            )
            self.stdout.write(self.style.SUCCESS(f"Admin yaratildi: admin / admin123"))

        # Courses & Levels
        english, _ = Course.objects.get_or_create(name='Ingliz tili')
        Course.objects.get_or_create(name='Rus tili')
        Course.objects.get_or_create(name='IT (Dasturlash)')

        for i, lvl in enumerate(['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced']):
            Level.objects.get_or_create(name=lvl, defaults={'order': i})

        beg = Level.objects.get(name='Beginner')
        inter = Level.objects.get(name='Intermediate')

        # Teacher
        t_user, created = User.objects.get_or_create(
            username='998901234567',
            defaults={'role': Role.TEACHER, 'phone': '998901234567',
                      'first_name': 'Dilshod', 'last_name': 'Karimov'}
        )
        if created:
            t_user.set_password('teacher123')
            t_user.save()
        teacher, _ = Teacher.objects.get_or_create(user=t_user, defaults={'percent': 35})

        # Groups
        g1, _ = Group.objects.get_or_create(
            name='English Beginners A',
            defaults={
                'course': english, 'level': beg,
                'weekday_pattern': WeekdayPattern.MWF,
                'lesson_time': time(10, 0),
                'monthly_fee': 600000,
                'teacher': teacher,
                'max_students': 15,
            })
        g2, _ = Group.objects.get_or_create(
            name='English Intermediate B',
            defaults={
                'course': english, 'level': inter,
                'weekday_pattern': WeekdayPattern.TTS,
                'lesson_time': time(18, 0),
                'monthly_fee': 800000,
                'teacher': teacher,
                'max_students': 15,
            })

        # Students
        sample_students = [
            ('998911111111', 'Aziz', 'Sobirov', g1),
            ('998922222222', 'Shaxzoda', 'Akmalova', g1),
            ('998933333333', 'Jasur', 'Umarov', g2),
            ('998944444444', 'Madina', 'Rashidova', g2),
            ('998955555555', 'Shohrux', 'Qodirov', g1),
        ]
        for phone, fn, ln, grp in sample_students:
            if User.objects.filter(username=phone).exists():
                continue
            u = User.objects.create_user(
                username=phone, password='student123',
                phone=phone, role=Role.STUDENT,
                first_name=fn, last_name=ln,
            )
            Student.objects.create(user=u, group=grp)

        # SMS templates
        for code, name, body in TEMPLATES:
            SmsTemplate.objects.get_or_create(code=code, defaults={'name': name, 'body': body})

        self.stdout.write(self.style.SUCCESS("Seed tugadi!"))
        self.stdout.write("  Admin:      admin / admin123")
        self.stdout.write("  Teacher:    998901234567 / teacher123")
        self.stdout.write("  Student:    998911111111 / student123")
