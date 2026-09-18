"""AppConfig for sales application."""

from django.apps import AppConfig


class SalesConfig(AppConfig):
    """Configuration for sales application."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sales'
    verbose_name = 'Vendas e Comissões'
