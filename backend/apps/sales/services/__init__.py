"""Módulo de serviços de domínio para a aplicação de vendas e comissões."""

from .commission_service import CommissionCalculationResult, CommissionService

__all__ = ["CommissionService", "CommissionCalculationResult"]
