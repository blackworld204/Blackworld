type BankOption = {
  name: string;
  swift?: string;
};

/** Major bank suggestions for countries not covered in the primary curated list. */
export const WORLD_BANKS: Record<string, BankOption[]> = {
  AF: [
    { name: "Afghanistan International Bank", swift: "AFIBAFKA" },
    { name: "Azizi Bank", swift: "AZBAAFKA" },
  ],
  AX: [{ name: "Ålandsbanken", swift: "AABAFI22" }],
  AL: [
    { name: "Banka Kombëtare Tregtare", swift: "NCBAALTX" },
    { name: "Raiffeisen Bank Albania", swift: "SGSBALTX" },
  ],
  DZ: [
    { name: "Banque Extérieure d'Algérie", swift: "BEXADZAL" },
    { name: "Banque Nationale d'Algérie", swift: "BNALDZAL" },
    { name: "Crédit Populaire d'Algérie", swift: "CPALDZAL" },
  ],
  AS: [{ name: "Bank of Hawaii American Samoa" }, { name: "ANZ American Samoa" }],
  AD: [
    { name: "Andorra Banc Agrícol Reig", swift: "BACAADAD" },
    { name: "MoraBanc", swift: "BINAADAD" },
  ],
  AO: [
    { name: "Banco Angolano de Investimentos", swift: "BAIPAOLU" },
    { name: "Banco de Fomento Angola", swift: "BFMTAOLU" },
    { name: "Banco Millennium Atlântico", swift: "BMAIAOLU" },
  ],
  AI: [{ name: "National Bank of Anguilla" }, { name: "Caribbean Commercial Bank" }],
  AG: [
    { name: "Antigua Commercial Bank" },
    { name: "Eastern Caribbean Amalgamated Bank" },
  ],
  AM: [
    { name: "Ameriabank", swift: "ARMIAM22" },
    { name: "Ardshinbank", swift: "ASHBAM22" },
    { name: "Inecobank", swift: "INJSAM22" },
  ],
  AW: [
    { name: "Aruba Bank", swift: "ARUBAWAX" },
    { name: "Caribbean Mercantile Bank", swift: "CMBAAWAX" },
  ],
  AZ: [
    { name: "International Bank of Azerbaijan", swift: "IBAWAZ22" },
    { name: "Kapital Bank", swift: "AIIBAZ2X" },
    { name: "PASHA Bank", swift: "PAHAZAZ2" },
  ],
  BS: [
    { name: "Bank of The Bahamas", swift: "BOTBBSNS" },
    { name: "Commonwealth Bank", swift: "COBAABSNS" },
    { name: "RBC Royal Bank Bahamas", swift: "ROYCBSNS" },
  ],
  BH: [
    { name: "Ahli United Bank", swift: "AUBBBHBM" },
    { name: "Bank of Bahrain and Kuwait", swift: "BBKUBHBM" },
    { name: "National Bank of Bahrain", swift: "NBOBBHBM" },
  ],
  BB: [
    { name: "FirstCaribbean International Bank", swift: "FCIBBBBB" },
    { name: "Republic Bank Barbados", swift: "RBBLBBBB" },
  ],
  BY: [
    { name: "Belarusbank", swift: "AKBBBY2X" },
    { name: "Belinvestbank", swift: "BLBBBY2X" },
    { name: "Priorbank", swift: "PJCBBY2X" },
  ],
  BZ: [
    { name: "Atlantic Bank", swift: "LIBABZBZ" },
    { name: "Belize Bank", swift: "BZEEBZBZ" },
  ],
  BJ: [
    { name: "Bank of Africa Bénin", swift: "AFRIBJBJ" },
    { name: "Ecobank Bénin", swift: "ECOCBJBJ" },
    { name: "Orabank Bénin", swift: "ORBKJBJB" },
  ],
  BM: [
    { name: "Butterfield Bank", swift: "BNTBBMHM" },
    { name: "HSBC Bank Bermuda", swift: "BBDABMHM" },
  ],
  BT: [
    { name: "Bank of Bhutan", swift: "BHUBBTBT" },
    { name: "Bhutan National Bank", swift: "BNBTBTBT" },
  ],
  BO: [
    { name: "Banco Mercantil Santa Cruz", swift: "MERBBOBO" },
    { name: "Banco Nacional de Bolivia", swift: "BNBOBOBO" },
    { name: "Banco Unión", swift: "BUNIBOBO" },
  ],
  BA: [
    { name: "Raiffeisen Bank Bosnia", swift: "RZBABA2S" },
    { name: "UniCredit Bank Banja Luka", swift: "BLBABA22" },
  ],
  BW: [
    { name: "Absa Bank Botswana", swift: "BARCBWGX" },
    { name: "First National Bank Botswana", swift: "FIRNBWGX" },
    { name: "Stanbic Bank Botswana", swift: "SBICBWGX" },
  ],
  VG: [
    { name: "FirstBank Virgin Islands" },
    { name: "VP Bank British Virgin Islands" },
  ],
  BN: [
    { name: "Bank Islam Brunei Darussalam", swift: "BIBDBNBB" },
    { name: "Baiduri Bank", swift: "BAIDBNBB" },
  ],
  BG: [
    { name: "DSK Bank", swift: "STSABGSF" },
    { name: "UniCredit Bulbank", swift: "UNCRBGSF" },
    { name: "United Bulgarian Bank", swift: "UBBSBGSF" },
  ],
  BF: [
    { name: "Bank of Africa Burkina Faso", swift: "AFRIBFBF" },
    { name: "Coris Bank", swift: "CORIBFBF" },
    { name: "Ecobank Burkina Faso", swift: "ECOCBFBF" },
  ],
  BI: [
    { name: "Banque de Crédit de Bujumbura", swift: "BCRIBIBI" },
    { name: "Interbank Burundi", swift: "INTERBIBI" },
  ],
  KH: [
    { name: "ACLEDA Bank", swift: "ACLBKHPP" },
    { name: "Canadia Bank", swift: "CADIKHPP" },
    { name: "Wing Bank" },
  ],
  CM: [
    { name: "Afriland First Bank", swift: "CCEICMCX" },
    { name: "Ecobank Cameroun", swift: "ECOCCMCX" },
    { name: "Société Générale Cameroun", swift: "SGCMCMCX" },
  ],
  CV: [
    { name: "Banco Comercial do Atlântico", swift: "BCATCVCV" },
    { name: "Caixa Económica de Cabo Verde", swift: "CECVCVCV" },
  ],
  BQ: [{ name: "Orco Bank" }, { name: "Maduro & Curiel's Bank" }],
  KY: [
    { name: "Cayman National Bank", swift: "CNBVKYKY" },
    { name: "Butterfield Bank Cayman", swift: "BNTBKYKY" },
  ],
  CF: [
    { name: "Ecobank Centrafrique", swift: "ECOCCFCF" },
    { name: "Banque Populaire Maroco-Centrafricaine" },
  ],
  TD: [
    { name: "Commercial Bank Tchad", swift: "CBTDTDND" },
    { name: "Ecobank Tchad", swift: "ECOCTDTD" },
  ],
  KM: [
    { name: "Banque pour l'Industrie et le Commerce", swift: "BICCKMKM" },
    { name: "Exim Bank Comoros" },
  ],
  CG: [
    { name: "Banque Commerciale Internationale", swift: "COPRCGCG" },
    { name: "Ecobank Congo", swift: "ECOCCGCG" },
  ],
  CD: [
    { name: "Rawbank", swift: "RAWBCDKI" },
    { name: "Equity BCDC", swift: "BCDCCDKI" },
    { name: "Trust Merchant Bank", swift: "TRMSCDKI" },
  ],
  CK: [{ name: "Bank of the Cook Islands" }, { name: "ANZ Cook Islands" }],
  CR: [
    { name: "Banco Nacional de Costa Rica", swift: "BNCRCRCR" },
    { name: "Banco de Costa Rica", swift: "BCRICRCJ" },
    { name: "BAC Credomatic", swift: "BCCRCRCR" },
  ],
  HR: [
    { name: "Erste & Steiermärkische Bank", swift: "ESBCHR22" },
    { name: "Privredna banka Zagreb", swift: "PBZGHR2X" },
    { name: "Zagrebačka banka", swift: "ZABAHR2X" },
  ],
  CU: [
    { name: "Banco Nacional de Cuba", swift: "BNCUCUHH" },
    { name: "Banco Popular de Ahorro" },
  ],
  CW: [
    { name: "Maduro & Curiel's Bank", swift: "MCBKCWCW" },
    { name: "Orco Bank", swift: "ORCBCWCW" },
  ],
  CY: [
    { name: "Bank of Cyprus", swift: "BCYPCY2N" },
    { name: "Hellenic Bank", swift: "HEBACY2N" },
    { name: "Eurobank Cyprus", swift: "ERBKCY2N" },
  ],
  CZ: [
    { name: "Česká spořitelna", swift: "GIBACZPX" },
    { name: "ČSOB", swift: "CEKOCZPP" },
    { name: "Komerční banka", swift: "KOMBCZPP" },
  ],
  DJ: [
    { name: "Banque pour le Commerce et l'Industrie — Mer Rouge", swift: "BCIMDJDJ" },
    { name: "CAC International Bank" },
  ],
  DM: [{ name: "National Bank of Dominica" }, { name: "FirstCaribbean Dominica" }],
  DO: [
    { name: "Banco Popular Dominicano", swift: "BPDODOSX" },
    { name: "BanReservas", swift: "BRRDDOSX" },
    { name: "Banco BHD", swift: "BHDIDOSX" },
  ],
  EC: [
    { name: "Banco Pichincha", swift: "PICHCECE" },
    { name: "Banco Guayaquil", swift: "GUAYECEG" },
    { name: "Produbanco", swift: "PRODECEG" },
  ],
  SV: [
    { name: "Banco Agrícola", swift: "BAGRSVSV" },
    { name: "Davivienda El Salvador", swift: "BSALSVSV" },
    { name: "BAC Credomatic El Salvador", swift: "BAMCSVSV" },
  ],
  GQ: [
    { name: "BGFIBank Guinée Équatoriale", swift: "BGFIEQGQ" },
    { name: "CCEI Bank GE" },
  ],
  ER: [{ name: "Housing and Commerce Bank of Eritrea" }],
  EE: [
    { name: "Luminor Bank", swift: "RIKOEE22" },
    { name: "SEB Pank", swift: "EEUHEE2X" },
    { name: "Swedbank Estonia", swift: "HABAEE2X" },
  ],
  SZ: [
    { name: "First National Bank Eswatini", swift: "FIRNSZMX" },
    { name: "Nedbank Eswatini", swift: "NEDSSZMX" },
    { name: "Standard Bank Eswatini", swift: "SBICSZMX" },
  ],
  ET: [
    { name: "Commercial Bank of Ethiopia", swift: "CBETETAA" },
    { name: "Awash Bank", swift: "AWINETAA" },
    { name: "Dashen Bank", swift: "DASHETAA" },
  ],
  FK: [{ name: "Standard Chartered Falkland Islands" }],
  FO: [{ name: "Betri Banki", swift: "FIFBFOTX" }, { name: "BankNordik", swift: "FIFBFOTX" }],
  FJ: [
    { name: "ANZ Fiji", swift: "ANZBFJFJ" },
    { name: "Bank of South Pacific", swift: "BOSPFJFJ" },
    { name: "Westpac Fiji", swift: "WPACFJFJ" },
  ],
  FI: [
    { name: "Nordea Finland", swift: "NDEAFIHH" },
    { name: "OP Financial Group", swift: "OKOYFIHH" },
    { name: "Danske Bank Finland", swift: "DABAFIHH" },
  ],
  GF: [{ name: "Banque Postale Guyane" }, { name: "BNP Paribas Guyane" }],
  PF: [
    { name: "Banque de Polynésie", swift: "BPOLPFTP" },
    { name: "Banque Socredo", swift: "SOCRPFTP" },
  ],
  GA: [
    { name: "BGFIBank Gabon", swift: "BGFIGALI" },
    { name: "Ecobank Gabon", swift: "ECOCGALI" },
    { name: "Orabank Gabon", swift: "ORBKGALI" },
  ],
  GM: [
    { name: "Ecobank Gambia", swift: "ECOCGMGM" },
    { name: "Guaranty Trust Bank Gambia", swift: "GTBAGMGM" },
    { name: "Trust Bank Gambia", swift: "TBLGGMGM" },
  ],
  GE: [
    { name: "Bank of Georgia", swift: "BAGAGE22" },
    { name: "TBC Bank", swift: "TBCBGE22" },
    { name: "Liberty Bank", swift: "LBRTGE22" },
  ],
  GI: [
    { name: "Gibraltar International Bank", swift: "GIBAGIGI" },
    { name: "Moneycorp Bank" },
  ],
  GR: [
    { name: "Alpha Bank", swift: "CRBAGRAA" },
    { name: "Eurobank", swift: "ERBKGRAA" },
    { name: "National Bank of Greece", swift: "ETHNGRAA" },
    { name: "Piraeus Bank", swift: "PIRBGRAA" },
  ],
  GL: [{ name: "GrønlandsBANKEN", swift: "GRENGLGX" }],
  GD: [{ name: "Republic Bank Grenada" }, { name: "RBTT Bank Grenada" }],
  GP: [{ name: "Banque des Antilles Françaises" }, { name: "BNP Paribas Guadeloupe" }],
  GU: [{ name: "Bank of Guam" }, { name: "Bank of Hawaii Guam" }],
  GT: [
    { name: "Banco Industrial", swift: "INDLGTGC" },
    { name: "Banrural", swift: "BRRLGTGC" },
    { name: "Banco G&T Continental", swift: "GTCOGTGC" },
  ],
  GG: [
    { name: "Butterfield Bank Guernsey", swift: "BNTBGGSX" },
    { name: "HSBC Bank Guernsey" },
  ],
  GN: [
    { name: "Banque Internationale pour le Commerce et l'Industrie de Guinée", swift: "BICIGNGN" },
    { name: "Ecobank Guinée", swift: "ECOCGNGN" },
  ],
  GW: [
    { name: "Banco da África Ocidental", swift: "BAOAGWGQ" },
    { name: "Orabank Guinée-Bissau" },
  ],
  GY: [
    { name: "Republic Bank Guyana", swift: "RBGLGYGE" },
    { name: "Demerara Bank", swift: "DMBKGYGE" },
  ],
  HT: [
    { name: "Banque Nationale de Crédit", swift: "BNCRHTPP" },
    { name: "Sogebank", swift: "SOGEHTPP" },
    { name: "Unibank Haiti", swift: "UNOCHTPP" },
  ],
  HN: [
    { name: "Banco Atlántida", swift: "ATTDHNTE" },
    { name: "Banco de Occidente", swift: "BOCCHNTE" },
    { name: "BAC Credomatic Honduras", swift: "BMILHNTE" },
  ],
  HU: [
    { name: "OTP Bank", swift: "OTPVHUHB" },
    { name: "Erste Bank Hungary", swift: "GIBAHUHB" },
    { name: "K&H Bank", swift: "OKHBHUHB" },
  ],
  IS: [
    { name: "Arion Bank", swift: "ARIONISRE" },
    { name: "Íslandsbanki", swift: "GLITISRE" },
    { name: "Landsbankinn", swift: "NBIIISRE" },
  ],
  IR: [
    { name: "Bank Melli Iran", swift: "MELIIRTH" },
    { name: "Bank Mellat", swift: "BKMTIRTH" },
    { name: "Bank Saderat Iran", swift: "BSIRIRTH" },
  ],
  IQ: [
    { name: "Trade Bank of Iraq", swift: "TRIQIQBA" },
    { name: "Rafidain Bank", swift: "RAFBIQBA" },
    { name: "National Bank of Iraq" },
  ],
  IM: [
    { name: "Isle of Man Bank", swift: "RBOSIMDX" },
    { name: "HSBC Bank Isle of Man" },
  ],
  IL: [
    { name: "Bank Hapoalim", swift: "POALILIT" },
    { name: "Bank Leumi", swift: "LUMIILIT" },
    { name: "Mizrahi-Tefahot Bank", swift: "MIZBILIT" },
  ],
  JM: [
    { name: "National Commercial Bank Jamaica", swift: "JNCBJMKX" },
    { name: "Scotiabank Jamaica", swift: "NOSCJMKX" },
    { name: "Sagicor Bank" },
  ],
  JE: [
    { name: "Butterfield Bank Jersey", swift: "BNTBJESH" },
    { name: "HSBC Bank Jersey" },
  ],
  JO: [
    { name: "Arab Bank", swift: "ARABJOAX" },
    { name: "Housing Bank for Trade and Finance", swift: "HBHOJOAX" },
    { name: "Jordan Kuwait Bank", swift: "JKBAJOAX" },
  ],
  KZ: [
    { name: "Halyk Bank", swift: "HSBKKZKX" },
    { name: "Kaspi Bank", swift: "CASPKZKA" },
    { name: "ForteBank", swift: "IRTYKZKA" },
  ],
  KI: [{ name: "ANZ Kiribati" }, { name: "Bank of Kiribati" }],
  XK: [
    { name: "Raiffeisen Bank Kosovo", swift: "RBKOXKPR" },
    { name: "ProCredit Bank Kosovo", swift: "MBKOXKPR" },
    { name: "TEB Bank Kosovo", swift: "TEBKXKPR" },
  ],
  KW: [
    { name: "National Bank of Kuwait", swift: "NBOKKWKW" },
    { name: "Gulf Bank", swift: "GULBKWKW" },
    { name: "Kuwait Finance House", swift: "KFHOKWKW" },
  ],
  KG: [
    { name: "Optima Bank", swift: "ENEJKG22" },
    { name: "Demir Bank", swift: "DEMIKG22" },
    { name: "KICB", swift: "KICBKG22" },
  ],
  LA: [
    { name: "Banque pour le Commerce Extérieur Lao", swift: "COEBLALA" },
    { name: "Joint Development Bank" },
  ],
  LV: [
    { name: "Swedbank Latvia", swift: "HABALV22" },
    { name: "SEB banka", swift: "UNLALV2X" },
    { name: "Citadele Banka", swift: "PARXLV22" },
  ],
  LB: [
    { name: "Bank Audi", swift: "AUDBLBBX" },
    { name: "BLOM Bank", swift: "BLOMLBBX" },
    { name: "Byblos Bank", swift: "BYBALBBX" },
  ],
  LS: [
    { name: "First National Bank Lesotho", swift: "FIRNLSLS" },
    { name: "Nedbank Lesotho", swift: "NEDSLSMX" },
    { name: "Standard Lesotho Bank", swift: "SBICLSMX" },
  ],
  LR: [
    { name: "Ecobank Liberia", swift: "ECOCLRLR" },
    { name: "Guaranty Trust Bank Liberia", swift: "GTBALRLR" },
  ],
  LY: [
    { name: "Jumhouria Bank", swift: "JAMBLYLT" },
    { name: "National Commercial Bank", swift: "NCBLLYLT" },
    { name: "Sahara Bank", swift: "SABLLYLT" },
  ],
  LI: [
    { name: "LGT Bank", swift: "LGTBLI2X" },
    { name: "VP Bank", swift: "VPBVLI2X" },
  ],
  LT: [
    { name: "Swedbank Lithuania", swift: "HABALT22" },
    { name: "SEB bankas", swift: "CBVILT2X" },
    { name: "Luminor Bank Lithuania", swift: "AGBLLT2X" },
  ],
  LU: [
    { name: "Banque et Caisse d'Épargne de l'État", swift: "BCEELULL" },
    { name: "BGL BNP Paribas", swift: "BGLLLULL" },
    { name: "Banque Internationale à Luxembourg", swift: "BILLLULL" },
  ],
  MO: [
    { name: "Bank of China Macau", swift: "BKCHMOMX" },
    { name: "Industrial and Commercial Bank of China Macau", swift: "ICBKMOMX" },
    { name: "Tai Fung Bank", swift: "TFBLMOMX" },
  ],
  MG: [
    { name: "Bank of Africa Madagascar", swift: "AFRIMGMG" },
    { name: "BFV-Société Générale", swift: "BFAVMGMG" },
    { name: "BNI Madagascar", swift: "BNIMGMG" },
  ],
  MW: [
    { name: "National Bank of Malawi", swift: "NBMAMWMW" },
    { name: "Standard Bank Malawi", swift: "SBICMWMX" },
    { name: "First Capital Bank", swift: "FCBLMWMW" },
  ],
  MV: [
    { name: "Bank of Maldives", swift: "MALDMVMV" },
    { name: "Maldives Islamic Bank" },
  ],
  ML: [
    { name: "Bank of Africa Mali", swift: "AFRIMLML" },
    { name: "Banque de Développement du Mali", swift: "BDMMMLML" },
    { name: "Ecobank Mali", swift: "ECOCMLML" },
  ],
  MT: [
    { name: "Bank of Valletta", swift: "VALLMTMT" },
    { name: "HSBC Bank Malta", swift: "MMEBMTMT" },
    { name: "APS Bank", swift: "APSBMTMT" },
  ],
  MH: [{ name: "Bank of the Marshall Islands" }],
  MQ: [{ name: "Banque des Antilles Françaises" }, { name: "BNP Paribas Martinique" }],
  MR: [
    { name: "Banque Pour le Commerce et l'Industrie", swift: "BCMAMRMR" },
    { name: "Banque Mauritanienne pour le Commerce International" },
  ],
  MU: [
    { name: "Mauritius Commercial Bank", swift: "MCBLMUMU" },
    { name: "SBM Bank", swift: "STCBMUMU" },
    { name: "Absa Bank Mauritius", swift: "BARCMUMU" },
  ],
  YT: [{ name: "Banque de Mayotte" }, { name: "BPCE International" }],
  FM: [{ name: "Bank of the Federated States of Micronesia" }],
  MD: [
    { name: "Moldova Agroindbank", swift: "AGRNMD2X" },
    { name: "Moldindconbank", swift: "MOLDMD2X" },
    { name: "Victoriabank", swift: "VICBMD2X" },
  ],
  MC: [
    { name: "CFM Indosuez Wealth Management", swift: "CFMUMCMC" },
    { name: "Société Générale Private Banking Monaco" },
  ],
  MN: [
    { name: "Khan Bank", swift: "AGMOMNUB" },
    { name: "Golomt Bank", swift: "GLMTMNUB" },
    { name: "Trade and Development Bank", swift: "TDBMMNUB" },
  ],
  ME: [
    { name: "Crnogorska komercijalna banka", swift: "CKBOME2P" },
    { name: "Hipotekarna banka", swift: "HBBNME2P" },
    { name: "NLB Banka Podgorica", swift: "MNBAMEPG" },
  ],
  MS: [{ name: "Bank of Montserrat" }],
  MZ: [
    { name: "Banco Comercial e de Investimentos", swift: "CGDIMZMA" },
    { name: "Millennium bim", swift: "BIMOMZMA" },
    { name: "Standard Bank Mozambique", swift: "SBICMZMX" },
  ],
  MM: [
    { name: "KBZ Bank", swift: "KBZBMMMY" },
    { name: "Ayeyarwady Bank", swift: "AYABMMMY" },
    { name: "CB Bank", swift: "CBBUMMMY" },
  ],
  NA: [
    { name: "Bank Windhoek", swift: "BWLINANX" },
    { name: "First National Bank Namibia", swift: "FIRNNANX" },
    { name: "Standard Bank Namibia", swift: "SBNMNANX" },
  ],
  NR: [{ name: "Bendigo Bank Nauru" }],
  NP: [
    { name: "Nepal Investment Mega Bank", swift: "NIBLNPKA" },
    { name: "Nabil Bank", swift: "NARBNPKA" },
    { name: "Global IME Bank", swift: "GLBBNPKA" },
  ],
  NC: [
    { name: "Banque Calédonienne d'Investissement", swift: "BCICNCNM" },
    { name: "Société Générale Calédonienne de Banque", swift: "SOGENCNM" },
  ],
  NI: [
    { name: "Banpro", swift: "BAPRNIMA" },
    { name: "BAC Credomatic Nicaragua", swift: "BAMCNIMA" },
    { name: "Lafise Bancentro", swift: "BCDFNIMA" },
  ],
  NE: [
    { name: "Bank of Africa Niger", swift: "AFRINENE" },
    { name: "Ecobank Niger", swift: "ECOCNENE" },
    { name: "Orabank Niger", swift: "ORBKNENE" },
  ],
  KP: [{ name: "Foreign Trade Bank of the DPRK" }],
  MK: [
    { name: "Komercijalna Banka", swift: "KOBSMK2X" },
    { name: "Stopanska Banka", swift: "STOBMK2X" },
    { name: "NLB Banka Skopje", swift: "TUTNMK22" },
  ],
  MP: [{ name: "Bank of Hawaii Northern Mariana Islands" }, { name: "Bank of Guam" }],
  OM: [
    { name: "Bank Muscat", swift: "BMUSOMRX" },
    { name: "National Bank of Oman", swift: "NBOMOMRX" },
    { name: "Bank Dhofar", swift: "BDOFOMRX" },
  ],
  PW: [{ name: "Bank of Hawaii Palau" }],
  PS: [
    { name: "Bank of Palestine", swift: "PALSPS22" },
    { name: "Arab Bank Palestine", swift: "ARABPS22" },
    { name: "Cairo Amman Bank" },
  ],
  PA: [
    { name: "Banco General", swift: "BAGEPAPA" },
    { name: "Banistmo", swift: "BANPPAPA" },
    { name: "BAC Credomatic Panamá", swift: "BACRPAPA" },
  ],
  PG: [
    { name: "Bank of South Pacific", swift: "BOSPPGPX" },
    { name: "ANZ Papua New Guinea", swift: "ANZBPGPX" },
    { name: "Westpac PNG", swift: "WPACPGPX" },
  ],
  PY: [
    { name: "Banco Itaú Paraguay", swift: "ITSUPYPA" },
    { name: "Banco Continental", swift: "BNITPYPA" },
    { name: "Banco Nacional de Fomento" },
  ],
  QA: [
    { name: "Qatar National Bank", swift: "QNBAQAQA" },
    { name: "Commercial Bank of Qatar", swift: "CBQAQAQA" },
    { name: "Masraf Al Rayan", swift: "MAFRQAQA" },
  ],
  RE: [{ name: "Banque de La Réunion" }, { name: "BPCE International Réunion" }],
  RO: [
    { name: "Banca Transilvania", swift: "BTRLRO22" },
    { name: "BCR", swift: "RNCBROBU" },
    { name: "BRD Groupe Société Générale", swift: "BRDEROBU" },
  ],
  RU: [
    { name: "Sberbank", swift: "SABRRUMM" },
    { name: "VTB Bank", swift: "VTBRRUMM" },
    { name: "Alfa-Bank", swift: "ALFARUMM" },
    { name: "Tinkoff Bank", swift: "TICSRUMM" },
  ],
  BL: [{ name: "Banque des Antilles Françaises" }],
  SH: [{ name: "Bank of St. Helena" }],
  KN: [{ name: "St. Kitts-Nevis-Anguilla National Bank" }, { name: "FirstCaribbean St. Kitts" }],
  LC: [{ name: "Bank of Saint Lucia" }, { name: "FirstCaribbean St. Lucia" }],
  MF: [{ name: "Banque des Antilles Françaises" }],
  PM: [{ name: "Banque de Saint-Pierre-et-Miquelon" }],
  VC: [{ name: "Bank of St. Vincent and the Grenadines" }, { name: "FirstCaribbean SVG" }],
  WS: [{ name: "ANZ Samoa" }, { name: "Bank South Pacific Samoa" }],
  SM: [{ name: "Banca di San Marino", swift: "BASMSMSM" }, { name: "Asset Banca" }],
  ST: [{ name: "Banco Internacional de São Tomé e Príncipe" }, { name: "Ecobank São Tomé" }],
  RS: [
    { name: "Banca Intesa Beograd", swift: "DBDBRSBG" },
    { name: "Komercijalna banka", swift: "KOBBRSBG" },
    { name: "Raiffeisen Bank Serbia", swift: "RZBSRSBG" },
  ],
  SC: [
    { name: "Absa Bank Seychelles", swift: "BARCSCSC" },
    { name: "Nouvobanq", swift: "NOVOSCSC" },
    { name: "Mauritius Commercial Bank Seychelles" },
  ],
  SL: [
    { name: "Ecobank Sierra Leone", swift: "ECOCSLSL" },
    { name: "Rokel Commercial Bank", swift: "RCBOSLSL" },
    { name: "Standard Chartered Sierra Leone", swift: "SCBLSLSL" },
  ],
  SX: [{ name: "Windward Islands Bank" }, { name: "Orco Bank Sint Maarten" }],
  SK: [
    { name: "Slovenská sporiteľňa", swift: "GIBASKBX" },
    { name: "Tatra banka", swift: "TATRSKBX" },
    { name: "VÚB banka", swift: "SUBASKBX" },
  ],
  SI: [
    { name: "NLB d.d.", swift: "LJBASI2X" },
    { name: "Nova KBM", swift: "KBMASI2X" },
    { name: "SKB Banka", swift: "SKBASI2X" },
  ],
  SB: [{ name: "Bank of South Pacific Solomon Islands" }, { name: "ANZ Solomon Islands" }],
  SO: [
    { name: "Dahabshiil Bank International" },
    { name: "Premier Bank Somalia" },
    { name: "Amal Bank" },
  ],
  SS: [
    { name: "Ivory Bank" },
    { name: "Kush Bank" },
    { name: "Nile Commercial Bank" },
  ],
  LK: [
    { name: "Bank of Ceylon", swift: "BCEYLKLX" },
    { name: "Commercial Bank of Ceylon", swift: "CCEYLKLX" },
    { name: "Hatton National Bank", swift: "HBLILKLX" },
  ],
  SD: [
    { name: "Bank of Khartoum", swift: "BAKASDKH" },
    { name: "Omdurman National Bank" },
    { name: "Faisal Islamic Bank" },
  ],
  SR: [
    { name: "De Surinaamsche Bank", swift: "SURCSRPA" },
    { name: "Hakrinbank", swift: "HAKRSRPA" },
    { name: "Republic Bank Suriname" },
  ],
  SY: [
    { name: "Commercial Bank of Syria", swift: "CMSYSYDA" },
    { name: "Real Estate Bank of Syria" },
  ],
  TW: [
    { name: "Bank of Taiwan", swift: "BKTWTWTP" },
    { name: "CTBC Bank", swift: "CTCBTWTP" },
    { name: "Cathay United Bank", swift: "UWCBTWTP" },
    { name: "First Commercial Bank", swift: "FCBKTWTP" },
  ],
  TJ: [
    { name: "Oriyonbank", swift: "OTJKTJ22" },
    { name: "Amonatbonk", swift: "ASACTJ22" },
    { name: "Eskhata Bank", swift: "EJSATJ22" },
  ],
  TL: [
    { name: "Banco Nacional de Comércio de Timor-Leste" },
    { name: "ANZ Timor-Leste" },
  ],
  TG: [
    { name: "Ecobank Togo", swift: "ECOCTGCG" },
    { name: "Orabank Togo", swift: "ORBKTGTG" },
    { name: "Banque Atlantique Togo", swift: "ATTGTGTG" },
  ],
  TO: [{ name: "Bank of South Pacific Tonga" }, { name: "ANZ Tonga" }],
  TT: [
    { name: "Republic Bank Trinidad and Tobago", swift: "RBNKTTPS" },
    { name: "First Citizens Bank", swift: "FCTTTTPS" },
    { name: "Scotiabank Trinidad and Tobago", swift: "NOSCTTPS" },
  ],
  TN: [
    { name: "Banque Internationale Arabe de Tunisie", swift: "BIATTNTT" },
    { name: "Banque Nationale Agricole", swift: "BNATTNTT" },
    { name: "Amen Bank", swift: "CFCTTNTT" },
  ],
  TM: [
    { name: "State Bank for Foreign Economic Affairs of Turkmenistan" },
    { name: "Halkbank Turkmenistan" },
  ],
  TC: [{ name: "Scotiabank Turks and Caicos" }, { name: "FirstCaribbean Turks and Caicos" }],
  TV: [{ name: "National Bank of Tuvalu" }],
  VI: [
    { name: "FirstBank Virgin Islands" },
    { name: "Banco Popular Virgin Islands" },
  ],
  UA: [
    { name: "PrivatBank", swift: "PBANUA2X" },
    { name: "Oschadbank", swift: "OSCHUA2X" },
    { name: "Raiffeisen Bank Aval", swift: "AVALUAUX" },
  ],
  UY: [
    { name: "Banco República", swift: "BROUUYMM" },
    { name: "Banco Itaú Uruguay", swift: "ITAUUYMM" },
    { name: "Scotiabank Uruguay", swift: "UBSUUYMM" },
  ],
  UZ: [
    { name: "National Bank of Uzbekistan", swift: "NBFAUZ22" },
    { name: "Uzpromstroybank", swift: "UJSIUZ22" },
    { name: "Kapitalbank", swift: "KACHUZ22" },
  ],
  VU: [{ name: "ANZ Vanuatu" }, { name: "Bank South Pacific Vanuatu" }],
  VA: [{ name: "Institute for the Works of Religion" }],
  VE: [
    { name: "Banco de Venezuela", swift: "VZLAVECA" },
    { name: "Banesco", swift: "BANVVECA" },
    { name: "Mercantil Banco", swift: "MENOVECA" },
  ],
  WF: [{ name: "Banque de Wallis-et-Futuna" }],
  YE: [
    { name: "International Bank of Yemen", swift: "IBYEYESA" },
    { name: "Yemen Bank for Reconstruction and Development" },
    { name: "Tadhamon Bank" },
  ],
  ZM: [
    { name: "Zanaco", swift: "ZNCOZMLU" },
    { name: "Stanbic Bank Zambia", swift: "SBICZMLX" },
    { name: "Absa Bank Zambia", swift: "BARCZMLX" },
  ],
  ZW: [
    { name: "CBZ Bank", swift: "COBZZWHX" },
    { name: "Stanbic Bank Zimbabwe", swift: "SBICZWHX" },
    { name: "Ecobank Zimbabwe", swift: "ECOCZWHX" },
  ],
};
