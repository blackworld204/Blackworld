export type BankOption = {
  name: string;
  swift?: string;
};

export type BankCountry = {
  code: string;
  name: string;
  banks: BankOption[];
};

export const BANK_COUNTRIES: BankCountry[] = [
  {
    code: "US",
    name: "United States",
    banks: [
      { name: "Atlantic Clearing", swift: "HARBPRSJ" },
      { name: "Bank of America", swift: "BOFAUS3N" },
      { name: "Capital One", swift: "HIBKUS44" },
      { name: "Citibank", swift: "CITIUS33" },
      { name: "HSBC Bank USA", swift: "MRMDUS33" },
      { name: "JPMorgan Chase", swift: "CHASUS33" },
      { name: "PNC Bank", swift: "PNCCUS33" },
      { name: "U.S. Bank", swift: "USBKUS44" },
      { name: "Wells Fargo", swift: "WFBIUS6S" },
    ],
  },
  {
    code: "PR",
    name: "Puerto Rico",
    banks: [
      { name: "Banco Popular", swift: "BPPRPRSJ" },
      { name: "FirstBank Puerto Rico" },
      { name: "Oriental Bank" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    banks: [
      { name: "ANZ", swift: "ANZBAU3M" },
      { name: "Commonwealth Bank", swift: "CTBAAU2S" },
      { name: "National Australia Bank", swift: "NATAAU33" },
      { name: "Westpac", swift: "WPACAU2S" },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    banks: [
      { name: "Banco do Brasil", swift: "BRASBRRJ" },
      { name: "Bradesco", swift: "BBDEBRSP" },
      { name: "Itaú Unibanco", swift: "ITAUBRSP" },
      { name: "Santander Brasil", swift: "BSCHBRSP" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    banks: [
      { name: "Bank of Montreal", swift: "BOFMCAM2" },
      { name: "Royal Bank of Canada", swift: "ROYCCAT2" },
      { name: "Scotiabank", swift: "NOSCCATT" },
      { name: "TD Canada Trust", swift: "TDOMCATTT" },
    ],
  },
  {
    code: "CN",
    name: "China",
    banks: [
      { name: "Agricultural Bank of China", swift: "ABOCCNBJ" },
      { name: "Bank of China", swift: "BKCHCNBJ" },
      { name: "China Construction Bank", swift: "PCBCCNBJ" },
      { name: "ICBC", swift: "ICBKCNBJ" },
    ],
  },
  {
    code: "FR",
    name: "France",
    banks: [
      { name: "BNP Paribas", swift: "BNPAFRPP" },
      { name: "Crédit Agricole", swift: "AGRIFRPP" },
      { name: "Société Générale", swift: "SOGEFRPP" },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    banks: [
      { name: "Commerzbank", swift: "COBADEFF" },
      { name: "Deutsche Bank", swift: "DEUTDEFF" },
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    banks: [
      { name: "Ecobank Ghana", swift: "ECOCGHAC" },
      { name: "GCB Bank", swift: "GHCBGHAC" },
      { name: "Stanbic Bank Ghana", swift: "SBICGHAC" },
    ],
  },
  {
    code: "IN",
    name: "India",
    banks: [
      { name: "Axis Bank", swift: "AXISINBB" },
      { name: "HDFC Bank", swift: "HDFCINBB" },
      { name: "ICICI Bank", swift: "ICICINBB" },
      { name: "State Bank of India", swift: "SBININBB" },
    ],
  },
  {
    code: "JP",
    name: "Japan",
    banks: [
      { name: "Mizuho Bank", swift: "MHCBJPJT" },
      { name: "MUFG Bank", swift: "BOTKJPJT" },
      { name: "Sumitomo Mitsui Banking Corporation", swift: "SMBCJPJT" },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    banks: [
      { name: "Co-operative Bank", swift: "KCOOKENA" },
      { name: "Equity Bank", swift: "EQBLKENA" },
      { name: "KCB Bank", swift: "KCBLKENX" },
    ],
  },
  {
    code: "MX",
    name: "Mexico",
    banks: [
      { name: "Banorte", swift: "MENOMXMT" },
      { name: "BBVA México", swift: "BCMRMXMM" },
      { name: "Citibanamex", swift: "BNMXMXMM" },
      { name: "Santander México", swift: "BMSXMXMM" },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    banks: [
      { name: "Access Bank", swift: "ABNGNGLA" },
      { name: "Citibank Nigeria", swift: "CITINGLA" },
      { name: "Ecobank Nigeria", swift: "ECOCNGLA" },
      { name: "Fidelity Bank", swift: "FIDTNGLA" },
      { name: "First Bank of Nigeria", swift: "FBNINGLA" },
      { name: "First City Monument Bank", swift: "FCMBNGLA" },
      { name: "Guaranty Trust Bank", swift: "GTBINGLA" },
      { name: "Keystone Bank", swift: "PLNINGLA" },
      { name: "Kuda Bank" },
      { name: "Moniepoint" },
      { name: "OPay" },
      { name: "PalmPay" },
      { name: "Polaris Bank", swift: "PRDTNGLA" },
      { name: "Providus Bank" },
      { name: "Stanbic IBTC Bank", swift: "SBICNGLX" },
      { name: "Standard Chartered", swift: "SCBLNGLA" },
      { name: "Sterling Bank", swift: "NAMENGLA" },
      { name: "Union Bank", swift: "UBNINGLA" },
      { name: "United Bank for Africa", swift: "UNAFNGLA" },
      { name: "Wema Bank", swift: "WEMANGLA" },
      { name: "Zenith Bank", swift: "ZEIBNGLA" },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    banks: [
      { name: "DBS Bank", swift: "DBSSSGSG" },
      { name: "OCBC Bank", swift: "OCBCSGSG" },
      { name: "UOB", swift: "UOVBSGSG" },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    banks: [
      { name: "Absa Bank", swift: "ABSAZAJJ" },
      { name: "FirstRand", swift: "FIRNZAJJ" },
      { name: "Nedbank", swift: "NEDSZAJJ" },
      { name: "Standard Bank", swift: "SBZAZAJJ" },
    ],
  },
  {
    code: "ES",
    name: "Spain",
    banks: [
      { name: "BBVA", swift: "BBVAESMM" },
      { name: "Banco Santander", swift: "BSCHESMM" },
      { name: "CaixaBank", swift: "CAIXESBB" },
    ],
  },
  {
    code: "CH",
    name: "Switzerland",
    banks: [
      { name: "Julius Baer", swift: "BAERCHZZ" },
      { name: "UBS", swift: "UBSWCHZH" },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    banks: [
      { name: "Abu Dhabi Commercial Bank", swift: "ADCBAEAA" },
      { name: "Emirates NBD", swift: "EBILAEAD" },
      { name: "First Abu Dhabi Bank", swift: "NBADAEAA" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    banks: [
      { name: "Barclays", swift: "BARCGB22" },
      { name: "HSBC", swift: "MIDLGB22" },
      { name: "Lloyds Bank", swift: "LOYDGB2L" },
      { name: "NatWest", swift: "NWBKGB2L" },
      { name: "Standard Chartered", swift: "SCBLGB2L" },
    ],
  },
];

export function banksIn(code: string) {
  return BANK_COUNTRIES.find((item) => item.code === code)?.banks ?? [];
}

export function countryOfBank(name: string) {
  const needle = name.trim().toLowerCase();
  if (!needle) return "US";
  return BANK_COUNTRIES.find((item) => item.banks.some((bank) => bank.name.toLowerCase() === needle))?.code ?? "US";
}

export function swiftOfBank(country: string, name: string) {
  return banksIn(country).find((bank) => bank.name === name)?.swift ?? "";
}
