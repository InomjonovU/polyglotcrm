from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default DRF paginator + client `?page_size=` parametrini qo'llab-quvvatlaydi.

    Maksimal 200 ta — abuse oldini olish uchun.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200
