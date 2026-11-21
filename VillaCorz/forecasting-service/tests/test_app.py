import unittest
from datetime import date, timedelta
from unittest.mock import Mock, patch

import numpy as np

from app import ForecastRequest, _predict, forecast, health


def build_history(
    end: date,
    days: int,
    value_for,
    holidays: dict[str, str] | None = None,
) -> list[dict]:
    points = []
    for offset in range(days - 1, -1, -1):
        day = end - timedelta(days=offset)
        points.append(
            {
                "date": day,
                "bookings": value_for(day, holidays or {}),
            }
        )
    return points


class SarimaxForecastTests(unittest.TestCase):
    def setUp(self) -> None:
        self.request = ForecastRequest(history=[], horizon=3, backtest_days=0)

    def test_forecast_uses_sarimax_even_without_booking_history(self) -> None:
        fitted = Mock()
        fitted.forecast.return_value = np.array([0.0, 0.0, 0.0])

        with patch("app.SARIMAX") as sarimax:
            sarimax.return_value.fit.return_value = fitted

            response = forecast(self.request)

        self.assertEqual(response.model, "sarimax")
        self.assertEqual([point.expected_bookings for point in response.forecast], [0, 0, 0])
        sarimax.assert_called_once()

    def test_sarimax_fit_errors_are_not_replaced_with_a_heuristic(self) -> None:
        with patch("app.SARIMAX") as sarimax:
            sarimax.return_value.fit.side_effect = RuntimeError("model fit failed")

            with self.assertRaisesRegex(RuntimeError, "model fit failed"):
                forecast(self.request)

    def test_health_reports_the_required_model(self) -> None:
        self.assertEqual(health(), {"ok": True, "model": "sarimax"})

    def test_weekend_multiplier_is_learned_from_history(self) -> None:
        as_of = date(2026, 2, 15)
        history = build_history(
            as_of - timedelta(days=1),
            70,
            lambda day, _: 20.0 if day.weekday() in (4, 5, 6) else 10.0,
        )
        request = ForecastRequest(
            history=history,
            horizon=10,
            backtest_days=0,
            as_of_date=as_of,
        )

        with patch("app._predict", return_value=[10.0] * 10):
            response = forecast(request)

        self.assertGreater(response.multipliers.weekend, 1.22)
        self.assertLessEqual(response.multipliers.weekend, 1.6)
        weekend_points = [
            point for point in response.forecast if point.is_weekend
        ]
        self.assertTrue(weekend_points)
        self.assertEqual(
            [point.factor for point in weekend_points],
            [response.multipliers.weekend] * len(weekend_points),
        )

    def test_holiday_multiplier_is_learned_from_training_history(self) -> None:
        holidays = {
            "2025-12-25": "Christmas Day",
            "2025-12-30": "Rizal Day",
            "2025-12-31": "New Year's Eve",
            "2026-01-01": "New Year's Day",
        }
        as_of = date(2026, 2, 15)
        history = build_history(
            as_of - timedelta(days=1),
            70,
            lambda day, names: 30.0 if day.isoformat() in names else 10.0,
            holidays,
        )
        request = ForecastRequest(
            history=history,
            horizon=3,
            backtest_days=0,
            holidays=holidays,
            as_of_date=as_of,
        )

        with patch("app._predict", return_value=[10.0] * 3):
            response = forecast(request)

        self.assertGreater(response.multipliers.holiday, 1.45)

    def test_backtest_uses_as_of_date_and_ignores_later_history(self) -> None:
        as_of = date(2026, 2, 15)
        history = build_history(as_of, 61, lambda day, _: 10.0)
        request = ForecastRequest(
            history=history,
            horizon=3,
            backtest_days=7,
            as_of_date=as_of,
        )

        with patch("app._predict", return_value=[8.0] * 7) as predict:
            response = forecast(request)

        self.assertIsNotNone(response.backtest)
        self.assertEqual(len(response.backtest.points), 7)
        self.assertEqual(response.backtest.points[-1].date, "2026-02-14")
        self.assertEqual(len(predict.call_args_list[-1].args[0]), 53)
        self.assertLessEqual(max(point.date for point in request.history), as_of)

    def test_backtest_keeps_mape_and_adds_wape(self) -> None:
        as_of = date(2026, 2, 15)
        history = build_history(as_of - timedelta(days=1), 60, lambda day, _: 10.0)
        request = ForecastRequest(
            history=history,
            horizon=3,
            backtest_days=7,
            as_of_date=as_of,
        )

        with patch("app._predict", return_value=[8.0] * 7):
            response = forecast(request)

        self.assertEqual(response.backtest.mape, 20.0)
        self.assertEqual(response.backtest.wape, 20.0)
        self.assertEqual(response.backtest.mae, 2.0)

    def test_recent_spikes_are_shrunk_toward_a_robust_level(self) -> None:
        values = [0.0] * 65 + [5.0] * 5
        fitted = Mock()
        fitted.forecast.return_value = np.array([10.0, 10.0, 10.0])

        with patch("app.SARIMAX") as sarimax:
            sarimax.return_value.fit.return_value = fitted
            predicted = _predict(values, 3)

        self.assertEqual(len(predicted), 3)
        self.assertTrue(all(value <= 2.0 for value in predicted))

    def test_stable_history_keeps_most_of_the_sarimax_signal(self) -> None:
        values = [10.0, 20.0] * 35
        fitted = Mock()
        fitted.forecast.return_value = np.array([20.0, 20.0, 20.0])

        with patch("app.SARIMAX") as sarimax:
            sarimax.return_value.fit.return_value = fitted
            predicted = _predict(values, 3)

        self.assertTrue(all(value >= 16.0 for value in predicted))

    def test_backtest_aligns_predictions_to_actual_dates_with_gaps(self) -> None:
        as_of = date(2026, 2, 15)
        history = build_history(as_of - timedelta(days=1), 61, lambda day, _: 10.0)
        missing = date(2026, 2, 12)
        history = [point for point in history if point["date"] != missing]
        request = ForecastRequest(
            history=history,
            horizon=3,
            backtest_days=7,
            as_of_date=as_of,
        )

        with patch("app._predict", return_value=[8.0] * 7):
            response = forecast(request)

        self.assertIsNotNone(response.backtest)
        self.assertEqual(len(response.backtest.points), 6)
        predicted_dates = [point.date for point in response.backtest.points]
        self.assertNotIn(missing.isoformat(), predicted_dates)
        self.assertEqual(response.backtest.points[-1].date, "2026-02-13")


if __name__ == "__main__":
    unittest.main()
