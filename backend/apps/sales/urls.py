"""Rotas REST da aplicação de vendas e comissões."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.sales.views import (
    CommissionReportView,
    CustomerViewSet,
    DayCommissionRuleViewSet,
    ProductViewSet,
    SaleViewSet,
    SalespersonViewSet,
)

app_name = "sales"

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"salespeople", SalespersonViewSet, basename="salesperson")
router.register(
    r"day-commission-rules",
    DayCommissionRuleViewSet,
    basename="day-commission-rule",
)
router.register(
    r"commission-rules",
    DayCommissionRuleViewSet,
    basename="commission-rule",
)
router.register(r"sales", SaleViewSet, basename="sale")

urlpatterns = [
    path("commissions/", CommissionReportView.as_view(), name="commission-report"),
    path("commissions/report/", CommissionReportView.as_view(), name="commission-report-alias"),
    path("", include(router.urls)),
]
