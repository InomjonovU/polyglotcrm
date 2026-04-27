"""Guruh jadvallari uchun yordamchilar."""
from datetime import date, timedelta


WEEKDAY_MAP = {
    'mwf': [0, 2, 4],       # Dush, Chor, Juma
    'tts': [1, 3, 5],       # Sesh, Pay, Shan
    'daily': [0, 1, 2, 3, 4, 5, 6],
    'weekend': [5, 6],
}


def is_lesson_day(group, target_date):
    """Guruh uchun shu kuni dars bor-yo'qligini qaytaradi.

    Guruhda `start_date` belgilangan bo'lsa, undan oldingi sanalar uchun False qaytaradi.
    """
    if group.start_date and target_date < group.start_date:
        return False
    weekdays = WEEKDAY_MAP.get(group.weekday_pattern, [])
    return target_date.weekday() in weekdays


def lesson_dates_in_range(group, start_date, end_date):
    """[start, end] oralig'idagi barcha dars kunlarini list qaytaradi.

    Guruhning `start_date`'idan oldingi sanalar chiqarib tashlanadi.
    """
    weekdays = WEEKDAY_MAP.get(group.weekday_pattern, [])
    effective_start = start_date
    if group.start_date and group.start_date > effective_start:
        effective_start = group.start_date
    dates = []
    d = effective_start
    while d <= end_date:
        if d.weekday() in weekdays:
            dates.append(d)
        d += timedelta(days=1)
    return dates


def has_lesson_today(group):
    return is_lesson_day(group, date.today())
