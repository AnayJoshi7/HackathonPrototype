def calculate_compensation(
    market_value: float,
    rural_multiplier: float = 2.0,
    solatium_rate: float = 1.0,
    assets_value: float = 0,
    rehabilitation_allowance: float = 0,
) -> dict[str, float]:
    """RFCTLARR-style demo calculation: multiplier + 100% solatium + assets/R&R."""
    multiplied = market_value * rural_multiplier
    solatium = multiplied * solatium_rate
    total = multiplied + solatium + assets_value + rehabilitation_allowance
    return {
        "market_value": round(market_value, 2),
        "multiplied_value": round(multiplied, 2),
        "solatium": round(solatium, 2),
        "assets_value": round(assets_value, 2),
        "rehabilitation_allowance": round(rehabilitation_allowance, 2),
        "total": round(total, 2),
    }