from django.db import migrations

DEFAULT_TEMPLATES = [
    {
        'code': 'welcome',
        'name': "Xush kelibsiz",
        'body': "Assalomu alaykum, {first_name}! {center_name} ga xush kelibsiz. Login: {phone}, parol: {password}. Muvaffaqiyatlar!",
        'is_active': True,
    },
    {
        'code': 'payment_reminder',
        'name': "To'lov eslatmasi",
        'body': "Hurmatli {first_name}, {month} oyi uchun to'lov muddati yaqinlashmoqda. To'lov miqdori: {amount} so'm. Iltimos, o'z vaqtida to'lang. {center_name}",
        'is_active': True,
    },
    {
        'code': 'payment_received',
        'name': "To'lov qabul qilindi",
        'body': "Hurmatli {first_name}, {amount} so'mlik to'lovingiz qabul qilindi. Chek raqami: {receipt_code}. Rahmat! {center_name}",
        'is_active': True,
    },
    {
        'code': 'payment_overdue',
        'name': "To'lov kechikdi",
        'body': "Hurmatli {first_name}, {month} oyi uchun {amount} so'mlik to'lov hali amalga oshirilmagan. Iltimos, imkon qadar tezroq to'lang. {center_name}",
        'is_active': True,
    },
    {
        'code': 'attendance_absent',
        'name': "Darsga kelmadi",
        'body': "Hurmatli ota-ona, {first_name} bugun {group} guruhida darsga kelmadi. Sababi haqida xabar bering. {center_name}",
        'is_active': True,
    },
    {
        'code': 'group_start',
        'name': "Guruh boshlandi",
        'body': "Hurmatli {first_name}, {group} guruhingiz {date} dan boshlanadi. Dars jadvali uchun administratorga murojaat qiling. {center_name}",
        'is_active': True,
    },
    {
        'code': 'password_reset',
        'name': "Yangi parol",
        'body': "Hurmatli {first_name}, tizimga kirish ma'lumotlari: Login: {phone}, Yangi parol: {password}. {center_name}",
        'is_active': True,
    },
    {
        'code': 'birthday',
        'name': "Tug'ilgan kun tabrigi",
        'body': "Hurmatli {first_name}, tug'ilgan kuningiz muborak! Sizga baxt, salomatlik va muvaffaqiyatlar tilaymiz! {center_name} jamoasi",
        'is_active': True,
    },
    {
        'code': 'exam_reminder',
        'name': "Imtihon eslatmasi",
        'body': "Hurmatli {first_name}, {group} guruhida {date} kuni imtihon bo'ladi. Tayyorlanib keling! {center_name}",
        'is_active': True,
    },
    {
        'code': 'group_frozen',
        'name': "Guruh to'xtatildi",
        'body': "Hurmatli {first_name}, {group} guruhingiz vaqtincha to'xtatildi. Tafsilotlar uchun administratorga murojaat qiling. {center_name}",
        'is_active': True,
    },
]


def add_templates(apps, schema_editor):
    SmsTemplate = apps.get_model('sms', 'SmsTemplate')
    for t in DEFAULT_TEMPLATES:
        SmsTemplate.objects.get_or_create(code=t['code'], defaults=t)


def remove_templates(apps, schema_editor):
    SmsTemplate = apps.get_model('sms', 'SmsTemplate')
    codes = [t['code'] for t in DEFAULT_TEMPLATES]
    SmsTemplate.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('sms', '0002_smssettings'),
    ]

    operations = [
        migrations.RunPython(add_templates, remove_templates),
    ]
