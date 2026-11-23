from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from statsmodels.tsa.statespace.sarimax import SARIMAX


app = FastAPI(title="VillaCorz Forecasting Service")

DEFAULT_WEEKEND_MULTIPLIER = 1.22
DEFAULT_HOLIDAY_MULTIPLIER = 1.45
ROBUST_WINDOW_DAYS = 28
MAX_STABILIZING_WEIGHT = 0.9


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
    as_of_date: date | None = None


class Multipliers(BaseModel):
    weekend: float
    holiday: float


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
    wape: float | None
    points: list[BacktestPoint]


class ForecastResponse(BaseModel):
    model: str
    forecast: list[ForecastPoint]
    backtest: BacktestSummary | None = None
    multipliers: Multipliers


def _is_weekend_day(target: date) -> bool:
    return target.weekday() in (4, 5, 6)


def _holiday_name(target: date, request: ForecastRequest) -> str | None:
    if not request.include_holidays:
        return None
    return request.holidays.get(target.isoformat())


def _robust_limit(values: list[float]) -> float:
    if not values:
        return 0.0

    array = np.asarray(values, dtype="float64")
    median = float(np.median(array))
    median_absolute_deviation = float(np.median(np.abs(array - median))) * 1.4826
    scale = (
        median_absolute_deviation
        if median_absolute_deviation > 0
        else float(np.std(array))
    )
    return max(2.0, median + 2.5 * scale)


def _stabilized_values(values: list[float]) -> list[float]:
    limit = _robust_limit(values)
    return [min(max(0.0, value), limit) for value in values]


def _robust_level(values: list[float]) -> float:
    window = values[-ROBUST_WINDOW_DAYS:] if values else []
    if not window:
        return 0.0
    return float(np.mean(window))


def _stabilizing_weight(values: list[float]) -> float:
    if not values:
        return 0.0

    limit = _robust_limit(values)
    zero_share = sum(value <= 0 for value in values) / len(values)
    outlier_share = sum(value > limit for value in values) / len(values)
    if zero_share < 0.2 and outlier_share < 0.02:
        return 0.15

    return min(MAX_STABILIZING_WEIGHT, 0.5 + 5 * outlier_share)


def _learned_ratio(
    points: list[tuple[date, float]],
    predicate,
    default: float,
    minimum_samples: int,
    lower: float,
    upper: float,
) -> float:
    selected = [value for day, value in points if predicate(day)]
    if len(selected) < minimum_samples:
        return default

    baseline = [value for day, value in points if not predicate(day)]
    if not baseline:
        return default

    selected_mean = sum(selected) / len(selected)
    baseline_mean = sum(baseline) / len(baseline)
    if baseline_mean <= 0:
        if selected_mean > 0:
            return upper
        return default

    raw_ratio = selected_mean / baseline_mean
    confidence = len(selected) / (len(selected) + 4)
    multiplier = 1.0 + (raw_ratio - 1.0) * confidence

    return round(min(upper, max(lower, multiplier)), 2)


def _learn_multipliers(
    history: list[HistoryPoint],
    request: ForecastRequest,
) -> Multipliers:
    raw_values = [max(0.0, float(point.bookings)) for point in history]
    values = [
        (point.date, stabilized)
        for point, stabilized in zip(history, _stabilized_values(raw_values))
    ]

    weekend = _learned_ratio(
        values,
        _is_weekend_day,
        DEFAULT_WEEKEND_MULTIPLIER,
        minimum_samples=6,
        lower=0.8,
        upper=1.6,
    )

    weekdays = [(day, value) for day, value in values if not _is_weekend_day(day)]
    holiday = _learned_ratio(
        weekdays,
        lambda day: _holiday_name(day, request) is not None,
        DEFAULT_HOLIDAY_MULTIPLIER,
        minimum_samples=2,
        lower=0.9,
        upper=2.0,
    )

    return Multipliers(weekend=weekend, holiday=holiday)


def _as_of(request: ForecastRequest, history: list[HistoryPoint]) -> date:
    if request.as_of_date is not None:
        return request.as_of_date
    if history:
        return max(point.date for point in history)
    return date.today()


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


def _seasonal_naive(values: list[float], horizon: int) -> list[float]:
    result: list[float] = []
    n = len(values)
    for step in range(1, horizon + 1):
        target_index = n + step - 1
        weekday = target_index % 7
        samples = [values[i] for i in range(n) if i % 7 == weekday]
        samples = samples[-4:]
        result.append(float(sum(samples) / len(samples)) if samples else 0.0)
    return result


def _normalized_continuous_series(
    points: list[HistoryPoint],
    request: ForecastRequest,
    multipliers: Multipliers,
) -> list[float]:
    if not points:
        return [0.0] * 90

    by_date = {point.date: max(0.0, float(point.bookings)) for point in points}
    start = min(by_date)
    end = max(by_date)
    values: list[float] = []
    cursor = start
    while cursor <= end:
        raw = by_date.get(cursor, 0.0)
        multiplier, _, _ = _demand_multiplier(cursor, request, multipliers)
        if multiplier and multiplier > 0:
            raw = raw / multiplier
        values.append(max(0.0, float(raw)))
        cursor += timedelta(days=1)
    return values


def _predict(values: list[float], horizon: int) -> list[float]:
    stabilized = _stabilized_values(values)
    series = pd.Series(stabilized, dtype="float64")
    model = SARIMAX(
        series,
        order=(1, 1, 1),
        seasonal_order=(1, 0, 1, 7),
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    fitted = model.fit(disp=False)
    predicted = np.asarray(fitted.forecast(steps=horizon), dtype="float64")
    if predicted.size != horizon or not np.isfinite(predicted).all():
        raise RuntimeError("SARIMAX returned an invalid forecast")



    level = _robust_level(stabilized)
    weight = _stabilizing_weight(values)
    adjusted = predicted * (1.0 - weight) + level * weight

    if stabilized:
        zero_share = sum(value <= 0 for value in stabilized) / len(stabilized)
        forecast_mean = float(np.mean(adjusted))
        if zero_share > 0.5 and forecast_mean > 0:
            adjusted = adjusted * min(4.0, max(1.0, 1.0 / forecast_mean))

    return [max(0.0, float(value)) for value in adjusted]


def _demand_multiplier(
    target: date,
    request: ForecastRequest,
    multipliers: Multipliers,
) -> tuple[float, bool, str | None]:
    is_weekend = request.include_weekends and _is_weekend_day(target)
    holiday = _holiday_name(target, request)

    multiplier = 1.0
    if is_weekend:
        multiplier *= multipliers.weekend
    if holiday:
        multiplier *= multipliers.holiday

    return multiplier, is_weekend, holiday


def _backtest(history: list[HistoryPoint], request: ForecastRequest) -> BacktestSummary | None:
    days = request.backtest_days
    today = _as_of(request, history)
    usable = [point for point in history if point.date < today]
    if days <= 0 or len(usable) <= days + 27:
        return None

    train = usable[:-days]
    holdout = usable[-days:]
    multipliers = _learn_multipliers(train, request)
    values = _normalized_continuous_series(train, request, multipliers)
    predicted = _predict(values, days)

    last_date = train[-1].date
    holdout_by_date = {
        point.date: max(0.0, float(point.bookings)) for point in holdout
    }
    points: list[BacktestPoint] = []
    absolute_errors: list[float] = []
    percentage_errors: list[float] = []
    actual_total = 0.0

    for offset, base in enumerate(predicted, start=1):
        target = last_date + timedelta(days=offset)
        if target not in holdout_by_date:
            continue

        multiplier, _, _ = _demand_multiplier(target, request, multipliers)
        predicted_bookings = max(0.0, base * multiplier)
        actual_bookings = holdout_by_date[target]
        error = abs(predicted_bookings - actual_bookings)
        absolute_errors.append(error)
        actual_total += actual_bookings
        if actual_bookings > 0:
            percentage_errors.append((error / actual_bookings) * 100)

        points.append(
            BacktestPoint(
                date=target.isoformat(),
                actual_bookings=round(actual_bookings, 1),
                predicted_bookings=round(predicted_bookings, 1),
            )
        )

    error_total = sum(absolute_errors)
    mae = error_total / max(1, len(absolute_errors))
    mape = sum(percentage_errors) / len(percentage_errors) if percentage_errors else None
    wape = (error_total / actual_total) * 100 if actual_total > 0 else None

    return BacktestSummary(
        window_days=days,
        model="sarimax",
        mae=round(mae, 2),
        mape=round(mape, 1) if mape is not None else None,
       
        wape=round(wape, 1) if wape is not None else None,
        points=points,
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "model": "sarimax"}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    history = sorted(request.history, key=lambda point: point.date)
    multipliers = _learn_multipliers(history, request)
    values = _normalized_continuous_series(history, request, multipliers)
    predicted = _predict(values, request.horizon)
    last_date = history[-1].date if history else _as_of(request, history)

    points: list[ForecastPoint] = []
    for offset, base in enumerate(predicted, start=1):
        target = last_date + timedelta(days=offset)
        multiplier, is_weekend, holiday = _demand_multiplier(
            target, request, multipliers
        )

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
        multipliers=multipliers,
    )
