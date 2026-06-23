"""Fixtures compartidas para los tests del ml_service."""
from types import SimpleNamespace


def make_lectura(temp=20.0, hum=60.0, viento=5.0, presion=1013.0):
    """Factory: crea un objeto lectura con los atributos que espera construir_lags."""
    return SimpleNamespace(
        temperatura=temp,
        humedad=hum,
        velocidad_viento=viento,
        presion=presion,
    )


def make_pred_om(anclas: dict, delta: float = 0.0) -> list[dict]:
    """Genera una lista de predicciones Open-Meteo con valores = ancla + delta."""
    return [
        {
            "hora_offset": h,
            "valor":       round(v + delta, 4),
            "datetime":    f"2024-01-01T{h % 24:02d}:00",
        }
        for h, v in anclas.items()
    ]
