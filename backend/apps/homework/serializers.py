from rest_framework import serializers
from .models import Homework


class HomeworkSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)

    class Meta:
        model = Homework
        fields = ['id', 'group', 'group_name', 'title', 'description', 'due_date',
                  'attachment', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at']
