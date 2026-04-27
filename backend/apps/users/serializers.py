from rest_framework import serializers
from .models import User, Role


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    teacher_type = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'phone', 'first_name', 'last_name',
                  'full_name', 'role', 'birth_date', 'address', 'is_active',
                  'teacher_type', 'children']
        read_only_fields = ['id', 'full_name', 'teacher_type', 'children']

    def get_teacher_type(self, obj):
        if obj.role == Role.TEACHER:
            t = getattr(obj, 'teacher_profile', None)
            if t:
                return t.type
        return None

    def get_children(self, obj):
        """Ota-ona uchun — ushbu telefon raqamga bog'langan farzand(lar)."""
        if obj.role != Role.PARENT or not obj.phone:
            return []
        from apps.students.models import Student
        children = Student.objects.filter(parent_phone=obj.phone).select_related('user')
        return [
            {
                'id': c.id,
                'full_name': c.user.full_name,
                'phone': c.user.phone,
            }
            for c in children
        ]


class LoginSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Role.choices)
    identifier = serializers.CharField()  # admin → username, others → phone
    password = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=4)
