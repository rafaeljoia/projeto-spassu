"""Modelos de domínio do sistema de vendas e comissões da Papelaria."""

from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import CheckConstraint, F, Q


class Product(models.Model):
    """Representa uma mercadoria comercializada pela papelaria."""

    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Código",
        help_text="Código identificador único do produto (SKU)",
    )
    description = models.CharField(
        max_length=255,
        verbose_name="Descrição",
        help_text="Descrição detalhada do produto",
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Preço Unitário (R$)",
        help_text="Preço unitário em reais, estritamente positivo",
    )
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('10.00')),
        ],
        verbose_name="Percentual de Comissão Padrão (%)",
        help_text="Percentual nominal cadastrado entre 0.00% e 10.00%",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Indica se o produto está ativo para novas vendas",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em",
    )

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["description"]
        constraints = [
            CheckConstraint(
                check=Q(unit_price__gt=0),
                name="check_product_unit_price_positive",
            ),
            CheckConstraint(
                check=Q(commission_percentage__gte=Decimal('0.00'))
                & Q(commission_percentage__lte=Decimal('10.00')),
                name="check_product_commission_range",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.description}"


class Customer(models.Model):
    """Representa um cliente cadastrado da papelaria."""

    name = models.CharField(
        max_length=200,
        verbose_name="Nome",
        help_text="Nome completo do cliente",
    )
    email = models.EmailField(
        max_length=254,
        verbose_name="E-mail",
        help_text="E-mail de contato do cliente",
    )
    phone = models.CharField(
        max_length=20,
        verbose_name="Telefone",
        help_text="Telefone de contato do cliente",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em",
    )

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Salesperson(models.Model):
    """Representa um profissional de vendas da papelaria."""

    name = models.CharField(
        max_length=200,
        verbose_name="Nome",
        help_text="Nome completo do vendedor",
    )
    email = models.EmailField(
        max_length=254,
        verbose_name="E-mail",
        help_text="E-mail corporativo ou de contato do vendedor",
    )
    phone = models.CharField(
        max_length=20,
        verbose_name="Telefone",
        help_text="Telefone de contato do vendedor",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em",
    )

    class Meta:
        verbose_name = "Vendedor"
        verbose_name_plural = "Vendedores"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class DayCommissionRule(models.Model):
    """Regra de limites de comissão por dia da semana (0=Segunda a 6=Domingo)."""

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, "Segunda-feira"
        TUESDAY = 1, "Terça-feira"
        WEDNESDAY = 2, "Quarta-feira"
        THURSDAY = 3, "Quinta-feira"
        FRIDAY = 4, "Sexta-feira"
        SATURDAY = 5, "Sábado"
        SUNDAY = 6, "Domingo"

    day_of_week = models.PositiveSmallIntegerField(
        unique=True,
        choices=DayOfWeek.choices,
        verbose_name="Dia da Semana",
        help_text="0 para Segunda-feira até 6 para Domingo",
    )
    min_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('10.00')),
        ],
        verbose_name="Percentual Mínimo (%)",
        help_text="Piso de comissão permitido para o dia (0.00% a 10.00%)",
    )
    max_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('10.00')),
        ],
        verbose_name="Percentual Máximo (%)",
        help_text="Teto de comissão permitido para o dia (0.00% a 10.00%)",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em",
    )

    class Meta:
        verbose_name = "Regra de Comissão por Dia"
        verbose_name_plural = "Regras de Comissão por Dia"
        ordering = ["day_of_week"]
        constraints = [
            CheckConstraint(
                check=Q(day_of_week__gte=0) & Q(day_of_week__lte=6),
                name="check_valid_day_of_week",
            ),
            CheckConstraint(
                check=Q(min_percentage__gte=Decimal('0.00'))
                & Q(min_percentage__lte=Decimal('10.00')),
                name="check_min_commission_range",
            ),
            CheckConstraint(
                check=Q(max_percentage__gte=Decimal('0.00'))
                & Q(max_percentage__lte=Decimal('10.00')),
                name="check_max_commission_range",
            ),
            CheckConstraint(
                check=Q(min_percentage__lte=F('max_percentage')),
                name="check_min_lte_max_commission",
            ),
        ]

    def clean(self) -> None:
        """Validação de integridade entre os limites mínimo e máximo."""
        super().clean()
        if (
            self.min_percentage is not None
            and self.max_percentage is not None
            and self.min_percentage > self.max_percentage
        ):
            raise ValidationError(
                {
                    "min_percentage": (
                        "O percentual mínimo não pode ser superior ao percentual máximo."
                    )
                }
            )

    def __str__(self) -> str:
        return (
            f"{self.get_day_of_week_display()}: "
            f"{self.min_percentage}% a {self.max_percentage}%"
        )
