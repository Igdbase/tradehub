export type ApprovedPracticeCryptoSpotAsset = {
  symbol: string;
  baseAsset: string;
  displayName: string;
};

export const APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS: readonly ApprovedPracticeCryptoSpotAsset[] = [
  { symbol: "BTCUSDT", baseAsset: "BTC", displayName: "Bitcoin / Tether" },
  { symbol: "ETHUSDT", baseAsset: "ETH", displayName: "Ethereum / Tether" },
  { symbol: "BNBUSDT", baseAsset: "BNB", displayName: "BNB / Tether" },
  { symbol: "SOLUSDT", baseAsset: "SOL", displayName: "Solana / Tether" },
  { symbol: "XRPUSDT", baseAsset: "XRP", displayName: "XRP / Tether" },
  { symbol: "ADAUSDT", baseAsset: "ADA", displayName: "Cardano / Tether" },
  { symbol: "DOGEUSDT", baseAsset: "DOGE", displayName: "Dogecoin / Tether" },
  { symbol: "TRXUSDT", baseAsset: "TRX", displayName: "TRON / Tether" },
  { symbol: "AVAXUSDT", baseAsset: "AVAX", displayName: "Avalanche / Tether" },
  { symbol: "LINKUSDT", baseAsset: "LINK", displayName: "Chainlink / Tether" },
  { symbol: "DOTUSDT", baseAsset: "DOT", displayName: "Polkadot / Tether" },
  { symbol: "LTCUSDT", baseAsset: "LTC", displayName: "Litecoin / Tether" },
  { symbol: "BCHUSDT", baseAsset: "BCH", displayName: "Bitcoin Cash / Tether" },
  { symbol: "NEARUSDT", baseAsset: "NEAR", displayName: "NEAR Protocol / Tether" },
  { symbol: "UNIUSDT", baseAsset: "UNI", displayName: "Uniswap / Tether" },
  { symbol: "AAVEUSDT", baseAsset: "AAVE", displayName: "Aave / Tether" },
  { symbol: "ATOMUSDT", baseAsset: "ATOM", displayName: "Cosmos / Tether" },
  { symbol: "ETCUSDT", baseAsset: "ETC", displayName: "Ethereum Classic / Tether" },
  { symbol: "FILUSDT", baseAsset: "FIL", displayName: "Filecoin / Tether" },
  { symbol: "ICPUSDT", baseAsset: "ICP", displayName: "Internet Computer / Tether" },
  { symbol: "APTUSDT", baseAsset: "APT", displayName: "Aptos / Tether" },
  { symbol: "ARBUSDT", baseAsset: "ARB", displayName: "Arbitrum / Tether" },
  { symbol: "OPUSDT", baseAsset: "OP", displayName: "Optimism / Tether" },
  { symbol: "SUIUSDT", baseAsset: "SUI", displayName: "Sui / Tether" },
  { symbol: "INJUSDT", baseAsset: "INJ", displayName: "Injective / Tether" },
  { symbol: "ALGOUSDT", baseAsset: "ALGO", displayName: "Algorand / Tether" },
  { symbol: "VETUSDT", baseAsset: "VET", displayName: "VeChain / Tether" },
  { symbol: "XLMUSDT", baseAsset: "XLM", displayName: "Stellar / Tether" },
  { symbol: "HBARUSDT", baseAsset: "HBAR", displayName: "Hedera / Tether" },
  { symbol: "TONUSDT", baseAsset: "TON", displayName: "Toncoin / Tether" },
  { symbol: "POLUSDT", baseAsset: "POL", displayName: "Polygon Ecosystem Token / Tether" },
  { symbol: "RUNEUSDT", baseAsset: "RUNE", displayName: "THORChain / Tether" },
  { symbol: "FETUSDT", baseAsset: "FET", displayName: "Artificial Superintelligence Alliance / Tether" },
  { symbol: "RENDERUSDT", baseAsset: "RENDER", displayName: "Render / Tether" },
  { symbol: "STXUSDT", baseAsset: "STX", displayName: "Stacks / Tether" },
  { symbol: "IMXUSDT", baseAsset: "IMX", displayName: "Immutable / Tether" },
  { symbol: "LDOUSDT", baseAsset: "LDO", displayName: "Lido DAO / Tether" },
  { symbol: "GRTUSDT", baseAsset: "GRT", displayName: "The Graph / Tether" },
  { symbol: "THETAUSDT", baseAsset: "THETA", displayName: "Theta Network / Tether" },
  { symbol: "ARUSDT", baseAsset: "AR", displayName: "Arweave / Tether" },
  { symbol: "SANDUSDT", baseAsset: "SAND", displayName: "The Sandbox / Tether" },
  { symbol: "MANAUSDT", baseAsset: "MANA", displayName: "Decentraland / Tether" },
  { symbol: "AXSUSDT", baseAsset: "AXS", displayName: "Axie Infinity / Tether" },
  { symbol: "CHZUSDT", baseAsset: "CHZ", displayName: "Chiliz / Tether" },
  { symbol: "KAVAUSDT", baseAsset: "KAVA", displayName: "Kava / Tether" },
  { symbol: "ZECUSDT", baseAsset: "ZEC", displayName: "Zcash / Tether" },
  { symbol: "IOTAUSDT", baseAsset: "IOTA", displayName: "IOTA / Tether" },
  { symbol: "FLOWUSDT", baseAsset: "FLOW", displayName: "Flow / Tether" },
  { symbol: "EGLDUSDT", baseAsset: "EGLD", displayName: "MultiversX / Tether" },
  { symbol: "QNTUSDT", baseAsset: "QNT", displayName: "Quant / Tether" },
  { symbol: "COMPUSDT", baseAsset: "COMP", displayName: "Compound / Tether" },
  { symbol: "CRVUSDT", baseAsset: "CRV", displayName: "Curve DAO / Tether" },
  { symbol: "SNXUSDT", baseAsset: "SNX", displayName: "Synthetix / Tether" },
  { symbol: "SUSHIUSDT", baseAsset: "SUSHI", displayName: "Sushi / Tether" },
  { symbol: "DYDXUSDT", baseAsset: "DYDX", displayName: "dYdX / Tether" },
  { symbol: "ENSUSDT", baseAsset: "ENS", displayName: "Ethereum Name Service / Tether" },
  { symbol: "GALAUSDT", baseAsset: "GALA", displayName: "Gala / Tether" },
  { symbol: "TIAUSDT", baseAsset: "TIA", displayName: "Celestia / Tether" },
  { symbol: "SEIUSDT", baseAsset: "SEI", displayName: "Sei / Tether" },
  { symbol: "JUPUSDT", baseAsset: "JUP", displayName: "Jupiter / Tether" },
  { symbol: "WLDUSDT", baseAsset: "WLD", displayName: "Worldcoin / Tether" },
  { symbol: "ONDOUSDT", baseAsset: "ONDO", displayName: "Ondo / Tether" },
  { symbol: "KSMUSDT", baseAsset: "KSM", displayName: "Kusama / Tether" },
  { symbol: "NEOUSDT", baseAsset: "NEO", displayName: "Neo / Tether" },
  { symbol: "QTUMUSDT", baseAsset: "QTUM", displayName: "Qtum / Tether" },
  { symbol: "ZILUSDT", baseAsset: "ZIL", displayName: "Zilliqa / Tether" }
] as const;

export const APPROVED_PRACTICE_CRYPTO_SPOT_SYMBOLS = new Set(
  APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.map((asset) => asset.symbol)
);

export const APPROVED_PRACTICE_CRYPTO_SPOT_BY_SYMBOL = new Map(
  APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.map((asset) => [asset.symbol, asset])
);
