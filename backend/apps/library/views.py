from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.users.permissions import IsAdmin
from .models import Book, BookSale
from .serializers import BookSerializer, BookSaleSerializer


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.select_related('course', 'level').all()
    serializer_class = BookSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['title', 'author', 'isbn', 'category']
    filterset_fields = ['language', 'course', 'level', 'category']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return super().get_permissions()
        return [IsAdmin()]


class BookSaleViewSet(viewsets.ModelViewSet):
    queryset = BookSale.objects.select_related('book', 'student__user', 'sold_by').all()
    serializer_class = BookSaleSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['book__title', 'student__user__first_name', 'student__user__last_name']
    filterset_fields = ['book', 'student', 'paid']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Admin va o'qituvchilar hammasini ko'radi; o'quvchi/ota-ona faqat o'zinikini
        if user.is_authenticated:
            if user.role == 'student':
                qs = qs.filter(student__user=user)
            elif user.role == 'parent':
                qs = qs.filter(student__parent_phone=user.phone)
        return qs

    def get_permissions(self):
        # O'quvchi/ota-ona o'z sotuvlarini ko'rishi mumkin (read-only)
        if self.action in ('list', 'retrieve'):
            return super().get_permissions()
        return [IsAdmin()]

    def perform_create(self, serializer):
        book = serializer.validated_data['book']
        # Stock kamaytirish (agar mavjud bo'lsa)
        if book.stock and book.stock > 0:
            book.stock -= 1
            book.save(update_fields=['stock'])
        # Agar narx kiritilmagan bo'lsa kitobning narxi olinadi
        if not serializer.validated_data.get('price'):
            serializer.validated_data['price'] = book.price
        serializer.save(sold_by=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        sale = self.get_object()
        if sale.paid:
            return Response({'detail': "Bu sotuv allaqachon to'langan deb belgilangan"}, status=400)
        sale.mark_paid(user=request.user)
        return Response(BookSaleSerializer(sale).data)

    @action(detail=True, methods=['post'])
    def mark_unpaid(self, request, pk=None):
        sale = self.get_object()
        sale.paid = False
        sale.paid_at = None
        sale.save(update_fields=['paid', 'paid_at'])
        return Response(BookSaleSerializer(sale).data)

    @action(detail=False, methods=['get'])
    def unpaid(self, request):
        """To'lanmagan sotuvlar."""
        qs = self.get_queryset().filter(paid=False)
        return Response(BookSaleSerializer(qs, many=True).data)
