export const CATALOG = Object.freeze({
  Large: [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AVGO", "TSLA", "JPM", "WMT",
    "XOM", "UNH", "V", "MA", "COST", "HD", "PG", "JNJ", "ABBV", "BAC",
    "KO", "PEP", "ORCL", "CRM", "ADBE", "CSCO", "QCOM", "AMD", "INTC", "T",
  ],
  Mid: [
    "CROX", "ETSY", "CHWY", "PINS", "ROKU", "DOCU", "SNAP", "LYFT", "DKNG", "AFRM",
    "UPST", "HOOD", "HIMS", "U", "SOFI", "RBLX", "RIVN", "CVNA", "BROS", "S",
    "PATH", "OKTA", "CELH", "NCLH", "DAL", "MGM", "F", "AAL", "PLUG", "NIO",
  ],
  Small: [
    "BARK", "BMBL", "BYND", "BLNK", "MVIS", "FUBO", "ACHR", "JOBY", "EVGO", "QS",
    "OUST", "SOUN", "KOS", "RIG", "GPRO", "PBI", "NNDM", "SKLZ", "SIRI", "NOK",
    "BB", "BAND", "RXT", "GCT", "SD", "TALO", "CRSR", "AI", "CLOV", "OPEN",
  ],
  ETF: ["SCHD", "VYM", "DGRO", "BND", "SGOV", "JEPI", "JEPQ", "SPHD", "VIG", "IWM", "VOO", "VTI"],
});

export const SECURITIES = Object.freeze(
  Object.entries(CATALOG).flatMap(([starterShelf, symbols]) =>
    symbols.map((symbol) => ({ symbol, starterShelf, type: starterShelf === "ETF" ? "ETF" : "Stock" })),
  ),
);

export const SYMBOLS = Object.freeze(SECURITIES.map(({ symbol }) => symbol));
export const SECURITY_BY_SYMBOL = new Map(SECURITIES.map((security) => [security.symbol, security]));
