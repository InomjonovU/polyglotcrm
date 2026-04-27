from datetime import timedelta
from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Role, LoginAttempt
from .serializers import LoginSerializer, UserSerializer, ChangePasswordSerializer


def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def check_block(identifier, ip):
    la = LoginAttempt.objects.filter(identifier=identifier, ip=ip).first()
    if la and la.blocked_until and la.blocked_until > timezone.now():
        remaining = (la.blocked_until - timezone.now()).seconds // 60 + 1
        return remaining
    return None


def register_failure(identifier, ip):
    la, _ = LoginAttempt.objects.get_or_create(identifier=identifier, ip=ip)
    la.attempts += 1
    if la.attempts >= settings.LOGIN_MAX_ATTEMPTS:
        la.blocked_until = timezone.now() + timedelta(minutes=settings.LOGIN_BLOCK_MINUTES)
        la.attempts = 0
    la.save()


def reset_attempts(identifier, ip):
    LoginAttempt.objects.filter(identifier=identifier, ip=ip).delete()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    role = serializer.validated_data['role']
    identifier = serializer.validated_data['identifier'].strip()
    password = serializer.validated_data['password']
    ip = get_client_ip(request)

    blocked_minutes = check_block(identifier, ip)
    if blocked_minutes:
        return Response(
            {'detail': f"Juda ko'p urinish. {blocked_minutes} daqiqadan keyin urinib ko'ring."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if role == Role.ADMIN:
        user = authenticate(username=identifier, password=password)
    else:
        # phone bo'yicha topamiz
        candidate = User.objects.filter(phone=identifier, role=role, is_active=True).first()
        user = authenticate(username=candidate.username, password=password) if candidate else None

    if not user or user.role != role:
        register_failure(identifier, ip)
        return Response(
            {'detail': "Login yoki parol noto'g'ri"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    reset_attempts(identifier, ip)
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def login_client_view(request):
    """
    O'quvchi / Ota-ona uchun yagona login.
    Telefon raqam + parol. Avval student, keyin parent sifatida tekshiradi.
    """
    identifier = (request.data.get('identifier') or '').strip()
    password = request.data.get('password') or ''
    ip = get_client_ip(request)

    if not identifier or not password:
        return Response({'detail': "Telefon va parol kerak"}, status=400)

    blocked_minutes = check_block(identifier, ip)
    if blocked_minutes:
        return Response(
            {'detail': f"Juda ko'p urinish. {blocked_minutes} daqiqadan keyin urinib ko'ring."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    user = None
    # 1) O'quvchi sifatida
    cand = User.objects.filter(phone=identifier, role=Role.STUDENT, is_active=True).first()
    if cand:
        user = authenticate(username=cand.username, password=password)

    # 2) Ota-ona sifatida (o'quvchi topilmagan bo'lsa yoki parol xato bo'lsa)
    if not user:
        cand = User.objects.filter(phone=identifier, role=Role.PARENT, is_active=True).first()
        if cand:
            user = authenticate(username=cand.username, password=password)

    if not user or user.role not in (Role.STUDENT, Role.PARENT):
        register_failure(identifier, ip)
        return Response(
            {'detail': "Login yoki parol noto'g'ri"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    reset_attempts(identifier, ip)
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if not request.user.check_password(serializer.validated_data['old_password']):
        return Response({'detail': "Eski parol noto'g'ri"}, status=400)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save()
    return Response({'detail': "Parol o'zgartirildi"})
