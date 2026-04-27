from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, LoginAttempt


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'phone', 'role', 'first_name', 'last_name', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'phone', 'first_name', 'last_name')
    fieldsets = UserAdmin.fieldsets + (
        ('Qo\'shimcha', {'fields': ('role', 'phone', 'birth_date', 'address')}),
    )


admin.site.register(LoginAttempt)
