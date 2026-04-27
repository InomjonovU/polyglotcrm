from rest_framework import serializers
from .models import Book, BookSale


class BookSerializer(serializers.ModelSerializer):
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True, default=None)
    level_name = serializers.CharField(source='level.name', read_only=True, default=None)
    sold_count = serializers.IntegerField(read_only=True)
    paid_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'language', 'language_display',
                  'course', 'course_name', 'level', 'level_name', 'category',
                  'isbn', 'price', 'stock', 'sold_count', 'paid_count',
                  'shelf_location', 'description', 'cover_url', 'file_url', 'created_at']


class BookSaleSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author', read_only=True)
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    student_phone = serializers.CharField(source='student.user.phone', read_only=True)
    sold_by_name = serializers.CharField(source='sold_by.full_name', read_only=True, default=None)

    class Meta:
        model = BookSale
        fields = ['id', 'book', 'book_title', 'book_author',
                  'student', 'student_name', 'student_phone',
                  'price', 'paid', 'paid_at', 'sold_at', 'sold_by', 'sold_by_name', 'note']
        read_only_fields = ['sold_at', 'paid_at', 'sold_by']
