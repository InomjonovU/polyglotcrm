from rest_framework import serializers
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_name', 'group', 'group_name', 'date',
                  'status', 'status_display', 'marked_by', 'created_at']
        read_only_fields = ['marked_by', 'created_at']


class BulkAttendanceItemSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    # status=null/empty => yozuvni o'chirish (belgilanmagan holatga qaytarish)
    status = serializers.ChoiceField(
        choices=['present', 'absent', 'late'],
        allow_null=True, allow_blank=True, required=False
    )


class BulkAttendanceSerializer(serializers.Serializer):
    group = serializers.IntegerField()
    date = serializers.DateField()
    items = BulkAttendanceItemSerializer(many=True)
