"""Views e ViewSets da API REST para o sistema de vendas e comissões."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.sales.models import Customer, DayCommissionRule, Product, Sale, Salesperson
from apps.sales.serializers import (
    CustomerSerializer,
    DayCommissionRuleSerializer,
    ProductSerializer,
    SaleCreateSerializer,
    SaleDetailSerializer,
    SalespersonSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="Listar catálogo de produtos",
        description="Retorna a lista de produtos disponíveis para preenchimento de itens na venda.",
    ),
    retrieve=extend_schema(
        summary="Detalhar produto",
        description="Retorna os dados cadastrais de um produto específico.",
    ),
)
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoints de leitura do catálogo de produtos."""

    queryset = Product.objects.filter(is_active=True).order_by("description")
    serializer_class = ProductSerializer
    pagination_class = None  # Catálogo para selects no formulário


@extend_schema_view(
    list=extend_schema(
        summary="Listar clientes",
        description="Retorna a lista de clientes para seleção no formulário de vendas.",
    ),
    retrieve=extend_schema(
        summary="Detalhar cliente",
        description="Retorna os dados completos de um cliente específico.",
    ),
)
class CustomerViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoints de leitura de clientes cadastrados."""

    queryset = Customer.objects.all().order_by("name")
    serializer_class = CustomerSerializer
    pagination_class = None  # Lista para selects no formulário


@extend_schema_view(
    list=extend_schema(
        summary="Listar vendedores",
        description="Retorna a lista de vendedores ativos para seleção no formulário de vendas.",
    ),
    retrieve=extend_schema(
        summary="Detalhar vendedor",
        description="Retorna os dados cadastrais de um vendedor específico.",
    ),
)
class SalespersonViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoints de leitura de vendedores da papelaria."""

    queryset = Salesperson.objects.all().order_by("name")
    serializer_class = SalespersonSerializer
    pagination_class = None  # Lista para selects no formulário


@extend_schema_view(
    list=extend_schema(
        summary="Listar regras de comissão por dia",
        description="Retorna os parâmetros de comissão mínima e máxima para os 7 dias da semana.",
    ),
)
class DayCommissionRuleViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoints de leitura das regras de comissão por dia da semana."""

    queryset = DayCommissionRule.objects.all().order_by("day_of_week")
    serializer_class = DayCommissionRuleSerializer
    pagination_class = None


@extend_schema_view(
    create=extend_schema(
        summary="Registrar nova venda",
        description=(
            "Registra uma venda com cliente, vendedor, nota fiscal única e itens, "
            "calculando automaticamente as comissões dinâmicas de acordo com o dia da semana."
        ),
        request=SaleCreateSerializer,
        responses={201: SaleDetailSerializer},
    ),
    retrieve=extend_schema(
        summary="Detalhar venda",
        description="Retorna o detalhamento completo de uma venda registrada e seus itens.",
        responses={200: SaleDetailSerializer},
    ),
    list=extend_schema(
        summary="Listar vendas realizadas",
        description="Retorna as vendas registradas com valores e totais de comissão.",
        responses={200: SaleDetailSerializer(many=True)},
    ),
)
class SaleViewSet(viewsets.ModelViewSet):
    """ViewSet para registro e consulta de vendas."""

    queryset = (
        Sale.objects.select_related("customer", "salesperson")
        .prefetch_related("items__product")
        .all()
        .order_by("-sold_at", "-created_at")
    )
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return SaleCreateSerializer
        return SaleDetailSerializer

    def create(self, request, *args, **kwargs):
        """Cria uma nova venda com itens de forma atômica e retorna o detalhe consolidado."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()

        # Retorna a representação completa com itens e cabeçalho
        response_serializer = SaleDetailSerializer(sale)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )
