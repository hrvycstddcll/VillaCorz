from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from statsmodels.tsa.statespace.sarimax import SARIMAX


app = FastAPI(title="VillaCorz Forecasting Service")


class HistoryPoint(BaseModel):
    date: date
    bookings: float = Field(ge=0, allow_inf_nan=False)


class ForecastRequest(BaseModel):
    history: list[HistoryPoint]
    holidays: dict[str, str] = Field(default_factory=dict)
    active_services: int = Field(default=1, ge=1)
    horizon: int = Field(default=30, ge=1, le=120)
    backtest_days: int = Field(default=14, ge=0, le=60)
    include_holidays: bool = True
    include_weekends: bool = True


class ForecastPoint(BaseModel):
    date: str
    expected_bookings: float
    expected_occupancy: float
    factor: float
    is_weekend: bool
    holiday: str | None = None


class BacktestPoint(BaseModel):
    date: str
    actual_bookings: float
    predicted_bookings: float


class BacktestSummary(BaseModel):
    window_days: int
    model: str
    mae: float
    mape: float | None
    points: list[BacktestPoint]


class ForecastResponse(BaseModel):
    model: str
    forecast: list[ForecastPoint]
    backtest: BacktestSummary | None = None


def _continuous_series(history: list[HistoryPoint]) -> list[float]:
    if not history:
        return [0.0] * 90

    by_date = {point.date: float(point.bookings) for point in history}
    start = min(by_date)
    end = max(by_date)
    values: list[float] = []
    cursor = start
    while cursor <= end:
        values.append(by_date.get(cursor, 0.0))
        cursor += timedelta(days=1)
    return values


def _predict(values: list[float], horizon: int) -> list[float]:
    series = pd.Series(values, dtype="float64")
    model = SARIMAX(
        series,
        order=(1, 0, 1),
        seasonal_order=(1, 0, 0, 7),
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    fitted = model.fit(disp=False)
    predicted = np.asarray(fitted.forecast(steps=horizon), dtype="float64")
    if predicted.size != horizon or not np.isfinite(predicted).all():
        raise RuntimeError("SARIMAX returned an invalid forecast")

    return [max(0.0, float(value)) for value in predicted]


def _demand_multiplier(
    target: date, request: ForecastRequest
) -> tuple[float, bool, str | None]:
    weekday = target.weekday()
    is_weekend = request.include_weekends and weekday in (4, 5, 6)
    holiday = request.holidays.get(target.isoformat()) if request.include_holidays else None

    multiplier = 1.0
    if request.include_weekends and is_weekend:
        multiplier *= 1.22
    if request.include_holidays and holiday:
        multiplier *= 1.45

    return multiplier, is_weekend, holiday


def _backtest(history: list[HistoryPoint], request: ForecastRequest) -> BacktestSummary | None:
    days = request.backtest_days
    today = date.today()
    usable = [point for point in history if point.date < today]
    if days <= 0 or len(usable) <= days + 27:
        return None

    train = usable[:-days]
    holdout = usable[-days:]
    values = _continuous_series(train)
    predicted = _predict(values, days)

    last_date = train[-1].date
    points: list[BacktestPoint] = []
    absolute_errors: list[float] = []
    percentage_errors: list[float] = []

    for offset, (base, actual_point) in enumerate(zip(predicted, holdout), start=1):
        target = last_date + timedelta(days=offset)
        multiplier, _, _ = _demand_multiplier(target, request)
        predicted_bookings = max(0.0, base * multiplier)
        actual_bookings = max(0.0, float(actual_point.bookings))
        error = abs(predicted_bookings - actual_bookings)
        absolute_errors.append(error)
        if actual_bookings > 0:
            percentage_errors.append((error / actual_bookings) * 100)

        points.append(
            BacktestPoint(
                date=actual_point.date.isoformat(),
                actual_bookings=round(actual_bookings, 1),
                predicted_bookings=round(predicted_bookings, 1),
            )
        )

    mae = sum(absolute_errors) / max(1, len(absolute_errors))
    mape = (
        sum(percentage_errors) / len(percentage_errors)
        if percentage_errors
        else None
    )

    return BacktestSummary(
        window_days=days,
        model="sarimax",
        mae=round(mae, 2),
        mape=round(mape, 1) if mape is not None else None,
        points=points,
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "model": "sarimax"}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    history = sorted(request.history, key=lambda point: point.date)
    values = _continuous_series(history)
    predicted = _predict(values, request.horizon)
    last_date = history[-1].date if history else date.today()

    points: list[ForecastPoint] = []
    for offset, base in enumerate(predicted, start=1):
        target = last_date + timedelta(days=offset)
        multiplier, is_weekend, holiday = _demand_multiplier(target, request)

        expected_bookings = base * multiplier
        occupancy = min(100.0, (expected_bookings / request.active_services) * 100.0)

        points.append(
            ForecastPoint(
                date=target.isoformat(),
                expected_bookings=round(expected_bookings, 1),
                expected_occupancy=round(occupancy, 1),
                factor=round(multiplier, 2),
                is_weekend=is_weekend,
                holiday=holiday,
            )
        )

    return ForecastResponse(
        model="sarimax",
        forecast=points,
        backtest=_backtest(history, request),
    )
