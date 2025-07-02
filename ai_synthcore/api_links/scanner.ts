
export const ApiLinks = {
  scanToken:       "/scan",
  batchScanTokens: "/batch-scan",
  tokenHistory:    (address: string) => `/history/${address}`,
  analyzeActivity: "/activity",
  analyzeDepth:    "/depth",
  detectPatterns:  "/patterns",
  holdings:        (mint: string) => `/holdings/${mint}`,
  transfers:       (mint: string) => `/transfers/${mint}`,
  risk:            (mint: string) => `/risk/${mint}`,
}
