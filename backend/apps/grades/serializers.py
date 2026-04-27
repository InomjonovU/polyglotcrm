from rest_framework import serializers
from .models import Grade


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Grade
        fields = ['id', 'student', 'student_name', 'group', 'type', 'type_display',
                  'value', 'title', 'note', 'date', 'given_by', 'created_at']
        read_only_fields = ['given_by', 'created_at']
