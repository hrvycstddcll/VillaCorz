import unittest
from unittest.mock import Mock, patch

import numpy as np

from app import ForecastRequest, forecast, health


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


if __name__ == "__main__":
    unittest.main()
