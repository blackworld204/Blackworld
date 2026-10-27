import { WORLD_COUNTRIES } from "@/lib/countries";
import { WORLD_BANKS } from "@/lib/banks-world";

export type BankOption = {
  name: string;
  swift?: string;
};

export type BankCountry = {
  code: string;
  name: string;
  banks: BankOption[];
};

/** Curated bank suggestions. Countries without an entry still appear in BANK_COUNTRIES. */
const BANKS_BY_COUNTRY: Record<string, BankOption[]> = {
  ...WORLD_BANKS,
  "US": [
    {
      "name": "Atlantic Clearing",
      "swift": "HARBPRSJ"
    },
    {
      "name": "Bank of America",
      "swift": "BOFAUS3N"
    },
    {
      "name": "Capital One",
      "swift": "HIBKUS44"
    },
    {
      "name": "Citibank",
      "swift": "CITIUS33"
    },
    {
      "name": "HSBC Bank USA",
      "swift": "MRMDUS33"
    },
    {
      "name": "JPMorgan Chase",
      "swift": "CHASUS33"
    },
    {
      "name": "PNC Bank",
      "swift": "PNCCUS33"
    },
    {
      "name": "U.S. Bank",
      "swift": "USBKUS44"
    },
    {
      "name": "Wells Fargo",
      "swift": "WFBIUS6S"
    }
  ],
  "PR": [
    {
      "name": "Banco Popular",
      "swift": "BPPRPRSJ"
    },
    {
      "name": "FirstBank Puerto Rico"
    },
    {
      "name": "Oriental Bank"
    }
  ],
  "AU": [
    {
      "name": "ANZ",
      "swift": "ANZBAU3M"
    },
    {
      "name": "Commonwealth Bank",
      "swift": "CTBAAU2S"
    },
    {
      "name": "National Australia Bank",
      "swift": "NATAAU33"
    },
    {
      "name": "Westpac",
      "swift": "WPACAU2S"
    }
  ],
  "BR": [
    {
      "name": "Banco do Brasil",
      "swift": "BRASBRRJ"
    },
    {
      "name": "Bradesco",
      "swift": "BBDEBRSP"
    },
    {
      "name": "Itaú Unibanco",
      "swift": "ITAUBRSP"
    },
    {
      "name": "Santander Brasil",
      "swift": "BSCHBRSP"
    }
  ],
  "CA": [
    {
      "name": "Bank of Montreal",
      "swift": "BOFMCAM2"
    },
    {
      "name": "Royal Bank of Canada",
      "swift": "ROYCCAT2"
    },
    {
      "name": "Scotiabank",
      "swift": "NOSCCATT"
    },
    {
      "name": "TD Canada Trust",
      "swift": "TDOMCATTT"
    }
  ],
  "CN": [
    {
      "name": "Agricultural Bank of China",
      "swift": "ABOCCNBJ"
    },
    {
      "name": "Bank of China",
      "swift": "BKCHCNBJ"
    },
    {
      "name": "China Construction Bank",
      "swift": "PCBCCNBJ"
    },
    {
      "name": "ICBC",
      "swift": "ICBKCNBJ"
    }
  ],
  "FR": [
    {
      "name": "BNP Paribas",
      "swift": "BNPAFRPP"
    },
    {
      "name": "Crédit Agricole",
      "swift": "AGRIFRPP"
    },
    {
      "name": "Société Générale",
      "swift": "SOGEFRPP"
    }
  ],
  "DE": [
    {
      "name": "Commerzbank",
      "swift": "COBADEFF"
    },
    {
      "name": "Deutsche Bank",
      "swift": "DEUTDEFF"
    }
  ],
  "GH": [
    {
      "name": "Ecobank Ghana",
      "swift": "ECOCGHAC"
    },
    {
      "name": "GCB Bank",
      "swift": "GHCBGHAC"
    },
    {
      "name": "Stanbic Bank Ghana",
      "swift": "SBICGHAC"
    }
  ],
  "IN": [
    {
      "name": "Axis Bank",
      "swift": "AXISINBB"
    },
    {
      "name": "HDFC Bank",
      "swift": "HDFCINBB"
    },
    {
      "name": "ICICI Bank",
      "swift": "ICICINBB"
    },
    {
      "name": "State Bank of India",
      "swift": "SBININBB"
    }
  ],
  "JP": [
    {
      "name": "Mizuho Bank",
      "swift": "MHCBJPJT"
    },
    {
      "name": "MUFG Bank",
      "swift": "BOTKJPJT"
    },
    {
      "name": "Sumitomo Mitsui Banking Corporation",
      "swift": "SMBCJPJT"
    }
  ],
  "KE": [
    {
      "name": "Co-operative Bank",
      "swift": "KCOOKENA"
    },
    {
      "name": "Equity Bank",
      "swift": "EQBLKENA"
    },
    {
      "name": "KCB Bank",
      "swift": "KCBLKENX"
    }
  ],
  "MX": [
    {
      "name": "Banorte",
      "swift": "MENOMXMT"
    },
    {
      "name": "BBVA México",
      "swift": "BCMRMXMM"
    },
    {
      "name": "Citibanamex",
      "swift": "BNMXMXMM"
    },
    {
      "name": "Santander México",
      "swift": "BMSXMXMM"
    }
  ],
  "NG": [
    {
      "name": "Access Bank",
      "swift": "ABNGNGLA"
    },
    {
      "name": "Citibank Nigeria",
      "swift": "CITINGLA"
    },
    {
      "name": "Ecobank Nigeria",
      "swift": "ECOCNGLA"
    },
    {
      "name": "Fidelity Bank",
      "swift": "FIDTNGLA"
    },
    {
      "name": "First Bank of Nigeria",
      "swift": "FBNINGLA"
    },
    {
      "name": "First City Monument Bank",
      "swift": "FCMBNGLA"
    },
    {
      "name": "Guaranty Trust Bank",
      "swift": "GTBINGLA"
    },
    {
      "name": "Keystone Bank",
      "swift": "PLNINGLA"
    },
    {
      "name": "Kuda Bank"
    },
    {
      "name": "Moniepoint"
    },
    {
      "name": "OPay"
    },
    {
      "name": "PalmPay"
    },
    {
      "name": "Polaris Bank",
      "swift": "PRDTNGLA"
    },
    {
      "name": "Providus Bank"
    },
    {
      "name": "Stanbic IBTC Bank",
      "swift": "SBICNGLX"
    },
    {
      "name": "Standard Chartered",
      "swift": "SCBLNGLA"
    },
    {
      "name": "Sterling Bank",
      "swift": "NAMENGLA"
    },
    {
      "name": "Union Bank",
      "swift": "UBNINGLA"
    },
    {
      "name": "United Bank for Africa",
      "swift": "UNAFNGLA"
    },
    {
      "name": "Wema Bank",
      "swift": "WEMANGLA"
    },
    {
      "name": "Zenith Bank",
      "swift": "ZEIBNGLA"
    }
  ],
  "SG": [
    {
      "name": "DBS Bank",
      "swift": "DBSSSGSG"
    },
    {
      "name": "OCBC Bank",
      "swift": "OCBCSGSG"
    },
    {
      "name": "UOB",
      "swift": "UOVBSGSG"
    }
  ],
  "ZA": [
    {
      "name": "Absa Bank",
      "swift": "ABSAZAJJ"
    },
    {
      "name": "FirstRand",
      "swift": "FIRNZAJJ"
    },
    {
      "name": "Nedbank",
      "swift": "NEDSZAJJ"
    },
    {
      "name": "Standard Bank",
      "swift": "SBZAZAJJ"
    }
  ],
  "ES": [
    {
      "name": "BBVA",
      "swift": "BBVAESMM"
    },
    {
      "name": "Banco Santander",
      "swift": "BSCHESMM"
    },
    {
      "name": "CaixaBank",
      "swift": "CAIXESBB"
    }
  ],
  "CH": [
    {
      "name": "Julius Baer",
      "swift": "BAERCHZZ"
    },
    {
      "name": "UBS",
      "swift": "UBSWCHZH"
    }
  ],
  "AE": [
    {
      "name": "Abu Dhabi Commercial Bank",
      "swift": "ADCBAEAA"
    },
    {
      "name": "Emirates NBD",
      "swift": "EBILAEAD"
    },
    {
      "name": "First Abu Dhabi Bank",
      "swift": "NBADAEAA"
    }
  ],
  "GB": [
    {
      "name": "Barclays",
      "swift": "BARCGB22"
    },
    {
      "name": "HSBC",
      "swift": "MIDLGB22"
    },
    {
      "name": "Lloyds Bank",
      "swift": "LOYDGB2L"
    },
    {
      "name": "NatWest",
      "swift": "NWBKGB2L"
    },
    {
      "name": "Standard Chartered",
      "swift": "SCBLGB2L"
    }
  ],
  "NL": [
    { "name": "ABN AMRO", "swift": "ABNANL2A" },
    { "name": "ING", "swift": "INGBNL2A" },
    { "name": "Rabobank", "swift": "RABONL2U" }
  ],
  "IT": [
    { "name": "Intesa Sanpaolo", "swift": "BCITITMM" },
    { "name": "UniCredit", "swift": "UNCRITMM" },
    { "name": "Banco BPM", "swift": "BAPPIT22" }
  ],
  "IE": [
    { "name": "AIB", "swift": "AIBKIE2D" },
    { "name": "Bank of Ireland", "swift": "BOFIIE2D" },
    { "name": "Permanent TSB", "swift": "IPBSIE2D" }
  ],
  "PT": [
    { "name": "Caixa Geral de Depósitos", "swift": "CGDIPTPL" },
    { "name": "Millennium BCP", "swift": "BCOMPTPL" },
    { "name": "Novo Banco", "swift": "BESCPTPL" }
  ],
  "BE": [
    { "name": "BNP Paribas Fortis", "swift": "GEBABEBB" },
    { "name": "KBC Bank", "swift": "KREDBEBB" },
    { "name": "Belfius", "swift": "GKCCBEBB" }
  ],
  "SE": [
    { "name": "Handelsbanken", "swift": "HANDSESS" },
    { "name": "Nordea", "swift": "NDEASESS" },
    { "name": "SEB", "swift": "ESSESESS" },
    { "name": "Swedbank", "swift": "SWEDSESS" }
  ],
  "NO": [
    { "name": "DNB", "swift": "DNBANOKK" },
    { "name": "Nordea Bank Norge", "swift": "NDEANOKK" }
  ],
  "DK": [
    { "name": "Danske Bank", "swift": "DABADKKK" },
    { "name": "Nordea Danmark", "swift": "NDEADKKK" },
    { "name": "Nykredit", "swift": "NYKBDKKK" }
  ],
  "PL": [
    { "name": "PKO Bank Polski", "swift": "BPKOPLPW" },
    { "name": "Bank Pekao", "swift": "PKOPPLPW" },
    { "name": "mBank", "swift": "BREXPLPW" }
  ],
  "AT": [
    { "name": "Erste Bank", "swift": "GIBAATWW" },
    { "name": "Raiffeisen Bank International", "swift": "RZBAATWW" }
  ],
  "NZ": [
    { "name": "ANZ New Zealand", "swift": "ANZBNZ22" },
    { "name": "ASB Bank", "swift": "ASBBNZ2A" },
    { "name": "BNZ", "swift": "BKNZNZ22" },
    { "name": "Westpac New Zealand", "swift": "WPACNZ2W" }
  ],
  "HK": [
    { "name": "Bank of China (Hong Kong)", "swift": "BKCHHKHH" },
    { "name": "Hang Seng Bank", "swift": "HASEHKHH" },
    { "name": "HSBC Hong Kong", "swift": "HSBCHKHH" },
    { "name": "Standard Chartered Hong Kong", "swift": "SCBLHKHH" }
  ],
  "KR": [
    { "name": "KB Kookmin Bank", "swift": "CZNBKRSE" },
    { "name": "Shinhan Bank", "swift": "SHBKKRSE" },
    { "name": "Woori Bank", "swift": "HVBKKRSE" }
  ],
  "PH": [
    { "name": "BDO Unibank", "swift": "BNORPHMM" },
    { "name": "Bank of the Philippine Islands", "swift": "BOPIPHMM" },
    { "name": "Metrobank", "swift": "MBTCPHMM" }
  ],
  "PK": [
    { "name": "Habib Bank", "swift": "HABBPKKA" },
    { "name": "MCB Bank", "swift": "MUCBPKKA" },
    { "name": "United Bank Limited", "swift": "UNILPKKA" }
  ],
  "BD": [
    { "name": "BRAC Bank", "swift": "BRAKBDDH" },
    { "name": "Dutch-Bangla Bank", "swift": "DBBLBDDH" },
    { "name": "Islami Bank Bangladesh", "swift": "IBBLBDDH" }
  ],
  "EG": [
    { "name": "Commercial International Bank", "swift": "CIBEEGCX" },
    { "name": "National Bank of Egypt", "swift": "NBEGEGCX" },
    { "name": "Banque Misr", "swift": "BMISEGCX" }
  ],
  "MA": [
    { "name": "Attijariwafa Bank", "swift": "BCMAMAMC" },
    { "name": "Banque Centrale Populaire", "swift": "BCPOMAMC" },
    { "name": "BMCE Bank", "swift": "BMCEMAMC" }
  ],
  "TZ": [
    { "name": "CRDB Bank", "swift": "CORUTZTZ" },
    { "name": "NMB Bank", "swift": "NMIBTZTZ" },
    { "name": "Stanbic Bank Tanzania", "swift": "SBICTZTX" }
  ],
  "UG": [
    { "name": "Centenary Bank", "swift": "CERBUGKA" },
    { "name": "Stanbic Bank Uganda", "swift": "SBICUGKX" },
    { "name": "dfcu Bank", "swift": "DFCUUGKA" }
  ],
  "RW": [
    { "name": "Bank of Kigali", "swift": "BKIGRWRW" },
    { "name": "Equity Bank Rwanda", "swift": "EQBLRWRW" },
    { "name": "I&M Bank Rwanda", "swift": "IMRWRWRW" }
  ],
  "CI": [
    { "name": "Ecobank Côte d'Ivoire", "swift": "ECOCCICI" },
    { "name": "Société Générale Côte d'Ivoire", "swift": "SOGECIAB" },
    { "name": "NSIA Banque", "swift": "NSIACICI" }
  ],
  "SN": [
    { "name": "Ecobank Sénégal", "swift": "ECOCSNDA" },
    { "name": "Société Générale Sénégal", "swift": "SGSESNDA" },
    { "name": "CBAO Groupe Attijariwafa Bank", "swift": "CBAOSNDA" }
  ],
  "TR": [
    { "name": "Akbank", "swift": "AKBKTRIS" },
    { "name": "Garanti BBVA", "swift": "TGBATRIS" },
    { "name": "İş Bankası", "swift": "ISBKTRIS" },
    { "name": "Yapı Kredi", "swift": "YAPITRIS" }
  ],
  "SA": [
    { "name": "Al Rajhi Bank", "swift": "RJHISARI" },
    { "name": "Saudi National Bank", "swift": "NCBKSAJE" },
    { "name": "Riyad Bank", "swift": "RIBLSARI" }
  ],
  "ID": [
    { "name": "Bank Central Asia", "swift": "CENAIDJA" },
    { "name": "Bank Mandiri", "swift": "BMRIIDJA" },
    { "name": "Bank Negara Indonesia", "swift": "BNINIDJA" },
    { "name": "Bank Rakyat Indonesia", "swift": "BRINIDJA" }
  ],
  "MY": [
    { "name": "CIMB Bank", "swift": "CIBBMYKL" },
    { "name": "Maybank", "swift": "MBBEMYKL" },
    { "name": "Public Bank", "swift": "PBBEMYKL" }
  ],
  "TH": [
    { "name": "Bangkok Bank", "swift": "BKKBTHBK" },
    { "name": "Kasikornbank", "swift": "KASITHBK" },
    { "name": "Siam Commercial Bank", "swift": "SICOTHBK" }
  ],
  "VN": [
    { "name": "Vietcombank", "swift": "BFTVVNVX" },
    { "name": "VietinBank", "swift": "ICBVVNVX" },
    { "name": "BIDV", "swift": "BIDVVNVX" }
  ],
  "AR": [
    { "name": "Banco Galicia", "swift": "GABAARBA" },
    { "name": "Banco Nación", "swift": "NACNARBA" },
    { "name": "BBVA Argentina", "swift": "BFRPARBA" }
  ],
  "CL": [
    { "name": "Banco de Chile", "swift": "BCHICLRM" },
    { "name": "Banco Santander Chile", "swift": "BSCHCLRM" },
    { "name": "BancoEstado", "swift": "BECHCLRM" }
  ],
  "CO": [
    { "name": "Bancolombia", "swift": "COLOCOBM" },
    { "name": "Banco de Bogotá", "swift": "BBOGCOBB" },
    { "name": "Davivienda", "swift": "CAFECOBB" }
  ],
  "PE": [
    { "name": "Banco de Crédito del Perú", "swift": "BCPLPEPL" },
    { "name": "Interbank", "swift": "BINPPEPL" },
    { "name": "BBVA Perú", "swift": "BCONPEPL" }
  ]
};

export const BANK_COUNTRIES: BankCountry[] = WORLD_COUNTRIES.map((item) => ({
  code: item.code,
  name: item.name,
  banks: BANKS_BY_COUNTRY[item.code] ?? [],
}));

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
