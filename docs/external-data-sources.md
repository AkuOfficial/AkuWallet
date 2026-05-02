# External Data Sources

## Market Prices
Unit prices for investments are fetched automatically using the **ticker** symbol from Yahoo Finance:
```
https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}
```
Example tickers: `AAPL`, `VOO`, `BTC-USD`, `SAP.DE`
Cache: 15 minutes (in-memory).

## Exchange Rates
Currency exchange rates are fetched from ExchangeRate-API:
```
https://api.exchangerate-api.com/v4/latest/{CURRENCY}
```
Cache: 24 hours (in-memory).
