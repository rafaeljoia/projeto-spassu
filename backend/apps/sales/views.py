from datetime import datetime, time
from decimal import Decimal
from django.db.models import Count, Sum
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sales.models import Customer, DayCommissionRule, Product, Sale, Salesperson
from apps.sales.serializers import (
    CommissionQuerySerializer,
    CommissionReportResponseSerializer,
    CustomerSerializer,
    DayCommissionRuleSerializer,
    ProductSerializer,
    SaleCreateSerializer,
    SaleDetailSerializer,
    SaleListSerializer,
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
        responses={200: SaleListSerializer(many=True)},
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
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return SaleCreateSerializer
        elif self.action == "list":
            return SaleListSerializer
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

    def update(self, request, *args, **kwargs):
        """Atualiza a venda recalculando dinamicamente os itens e comissões."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = SaleCreateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()

        response_serializer = SaleDetailSerializer(sale)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    summary="Consulta de total de comissões por período",
    description=(
        "Retorna a consolidação de comissões auferidas exclusivamente por vendedores que tiveram "
        "vendas no intervalo de datas especificado, juntamente com o somatório geral consolidado."
    ),
    parameters=[CommissionQuerySerializer],
    responses={
        200: CommissionReportResponseSerializer,
        400: OpenApiResponse(description="Parâmetros obrigatórios ausentes ou data inicial maior que data final"),
    },
)
class CommissionReportView(APIView):
    """Endpoint para relatório e apuração gerencial de comissões por período."""

    def get(self, request, *args, **kwargs):
        query_serializer = CommissionQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            errors = query_serializer.errors
            if "detail" in errors:
                detail_msg = errors["detail"]
                if isinstance(detail_msg, list):
                    detail_msg = detail_msg[0]
                return Response({"detail": detail_msg}, status=status.HTTP_400_BAD_REQUEST)
            if "start_date" in errors or "end_date" in errors:
                return Response(
                    {
                        "detail": "Os parâmetros start_date e end_date são obrigatórios no formato YYYY-MM-DD."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if "non_field_errors" in errors:
                return Response(
                    {"detail": errors["non_field_errors"][0]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        start_date = query_serializer.validated_data["start_date"]
        end_date = query_serializer.validated_data["end_date"]

        # Define início às 00:00:00 e término às 23:59:59.999999
        start_datetime = timezone.make_aware(datetime.combine(start_date, time.min))
        end_datetime = timezone.make_aware(datetime.combine(end_date, time.max))

        sales_in_period = Sale.objects.filter(
            sold_at__gte=start_datetime,
            sold_at__lte=end_datetime,
        )

        salesperson_aggregates = (
            sales_in_period.values("salesperson__id", "salesperson__name")
            .annotate(
                sales_count=Count("id"),
                total_commission=Sum("total_commission"),
            )
            .order_by("-total_commission", "salesperson__name")
        )

        salespeople_list = []
        grand_total = Decimal("0.00")

        for row in salesperson_aggregates:
            comm = row["total_commission"] or Decimal("0.00")
            grand_total += comm
            salespeople_list.append(
                {
                    "salesperson_id": row["salesperson__id"],
                    "salesperson_name": row["salesperson__name"],
                    "sales_count": row["sales_count"],
                    "total_commission": f"{comm:.2f}",
                }
            )

        response_data = {
            "start_date": str(start_date),
            "end_date": str(end_date),
            "salespeople": salespeople_list,
            "grand_total_commission": f"{grand_total:.2f}",
        }

        return Response(response_data, status=status.HTTP_200_OK)

