from rest_framework import serializers
from .models import Lead, LeadActivity


class LeadActivitySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')

    class Meta:
        model = LeadActivity
        fields = ['id', 'lead', 'kind', 'text', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at']


class LeadSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    course_name = serializers.CharField(source='interest_course.name', read_only=True, default=None)
    level_name = serializers.CharField(source='interest_level.name', read_only=True, default=None)
    assigned_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)
    referrer_name = serializers.SerializerMethodField()
    activities = LeadActivitySerializer(many=True, read_only=True)

    class Meta:
        model = Lead
        fields = ['id', 'full_name', 'phone', 'source', 'source_display',
                  'interest_course', 'course_name', 'interest_level', 'level_name',
                  'status', 'status_display', 'assigned_to', 'assigned_name',
                  'notes', 'trial_date',
                  'referrer_student', 'referrer_teacher', 'referrer_name',
                  'converted_student', 'activities',
                  'created_at', 'updated_at']

    def get_referrer_name(self, obj):
        if obj.referrer_student_id:
            return f"👤 {obj.referrer_student.user.full_name}"
        if obj.referrer_teacher_id:
            return f"🎓 {obj.referrer_teacher.user.full_name}"
        return None
