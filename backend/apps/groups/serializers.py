from rest_framework import serializers
from .models import Group, Course, Level, LessonCancellation, GroupScheduleChange


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = '__all__'


class GroupSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    level_name = serializers.CharField(source='level.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.user.full_name', read_only=True)
    support_teacher_name = serializers.CharField(source='support_teacher.user.full_name', read_only=True, default=None)
    active_students_count = serializers.IntegerField(read_only=True)
    weekday_pattern_display = serializers.CharField(source='get_weekday_pattern_display', read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'course', 'course_name', 'level', 'level_name',
                  'weekday_pattern', 'weekday_pattern_display', 'lesson_time',
                  'start_date',
                  'monthly_fee', 'teacher', 'teacher_name',
                  'support_teacher', 'support_teacher_name',
                  'max_students', 'is_active', 'active_students_count', 'created_at']


class LessonCancellationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonCancellation
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class GroupScheduleChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupScheduleChange
        fields = '__all__'
        read_only_fields = ['changed_by', 'created_at']
