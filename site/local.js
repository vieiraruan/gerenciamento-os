/* Idioma pela localização da pessoa.
 * O fuso horário do aparelho (ajustado pelo próprio celular/computador conforme o lugar onde ele está)
 * indica o país; o país indica o idioma. Tudo acontece no navegador: nada é enviado nem guardado fora dele.
 * Arquivo idêntico em site/local.js e apps/contract-generator/app/local.js. Tabela gerada da base oficial de
 * fusos (tzdata: zone.tab + nomes antigos), só com os países onde se fala um dos idiomas do site. */
(function (g) {
  // país → fusos horários
  var POR_PAIS = {
    AO: 'Africa/Luanda',
    AR: 'America/Argentina/Buenos_Aires America/Argentina/Catamarca America/Argentina/ComodRivadavia America/Argentina/Cordoba America/Argentina/Jujuy America/Argentina/La_Rioja America/Argentina/Mendoza America/Argentina/Rio_Gallegos America/Argentina/Salta America/Argentina/San_Juan America/Argentina/San_Luis America/Argentina/Tucuman America/Argentina/Ushuaia America/Buenos_Aires America/Catamarca America/Cordoba America/Jujuy America/Mendoza America/Rosario',
    AT: 'Europe/Vienna',
    BE: 'Europe/Brussels',
    BF: 'Africa/Ouagadougou',
    BI: 'Africa/Bujumbura',
    BJ: 'Africa/Porto-Novo',
    BL: 'America/St_Barthelemy',
    BO: 'America/La_Paz',
    BR: 'America/Araguaina America/Bahia America/Belem America/Boa_Vista America/Campo_Grande America/Cuiaba America/Eirunepe America/Fortaleza America/Maceio America/Manaus America/Noronha America/Porto_Acre America/Porto_Velho America/Recife America/Rio_Branco America/Santarem America/Sao_Paulo Brazil/Acre Brazil/DeNoronha Brazil/East Brazil/West',
    CA: 'America/Atikokan America/Blanc-Sablon America/Cambridge_Bay America/Coral_Harbour America/Creston America/Dawson America/Dawson_Creek America/Edmonton America/Fort_Nelson America/Glace_Bay America/Goose_Bay America/Halifax America/Inuvik America/Iqaluit America/Moncton America/Montreal America/Nipigon America/Pangnirtung America/Rainy_River America/Rankin_Inlet America/Regina America/Resolute America/St_Johns America/Swift_Current America/Thunder_Bay America/Toronto America/Vancouver America/Whitehorse America/Winnipeg America/Yellowknife Canada/Atlantic Canada/Central Canada/Eastern Canada/Mountain Canada/Newfoundland Canada/Pacific Canada/Saskatchewan Canada/Yukon',
    CD: 'Africa/Kinshasa Africa/Lubumbashi',
    CF: 'Africa/Bangui',
    CG: 'Africa/Brazzaville',
    CH: 'Europe/Zurich',
    CI: 'Africa/Abidjan',
    CL: 'America/Coyhaique America/Punta_Arenas America/Santiago Chile/Continental Chile/EasterIsland Pacific/Easter',
    CM: 'Africa/Douala',
    CO: 'America/Bogota',
    CR: 'America/Costa_Rica',
    CU: 'America/Havana',
    CV: 'Atlantic/Cape_Verde',
    DE: 'Europe/Berlin Europe/Busingen',
    DJ: 'Africa/Djibouti',
    DO: 'America/Santo_Domingo',
    DZ: 'Africa/Algiers',
    EC: 'America/Guayaquil Pacific/Galapagos',
    ES: 'Africa/Ceuta Atlantic/Canary Europe/Madrid',
    FR: 'Europe/Paris',
    GA: 'Africa/Libreville',
    GF: 'America/Cayenne',
    GN: 'Africa/Conakry',
    GP: 'America/Guadeloupe',
    GQ: 'Africa/Malabo',
    GT: 'America/Guatemala',
    GW: 'Africa/Bissau',
    HN: 'America/Tegucigalpa',
    HT: 'America/Port-au-Prince',
    KM: 'Indian/Comoro',
    LI: 'Europe/Vaduz',
    LU: 'Europe/Luxembourg',
    MA: 'Africa/Casablanca',
    MC: 'Europe/Monaco',
    MF: 'America/Marigot',
    MG: 'Indian/Antananarivo',
    ML: 'Africa/Bamako Africa/Timbuktu',
    MQ: 'America/Martinique',
    MX: 'America/Bahia_Banderas America/Cancun America/Chihuahua America/Ciudad_Juarez America/Ensenada America/Hermosillo America/Matamoros America/Mazatlan America/Merida America/Mexico_City America/Monterrey America/Ojinaga America/Santa_Isabel America/Tijuana Mexico/BajaNorte Mexico/BajaSur Mexico/General',
    MZ: 'Africa/Maputo',
    NC: 'Pacific/Noumea',
    NE: 'Africa/Niamey',
    NI: 'America/Managua',
    PA: 'America/Panama',
    PE: 'America/Lima',
    PF: 'Pacific/Gambier Pacific/Marquesas Pacific/Tahiti',
    PM: 'America/Miquelon',
    PR: 'America/Puerto_Rico',
    PT: 'Atlantic/Azores Atlantic/Madeira Europe/Lisbon',
    PY: 'America/Asuncion',
    RE: 'Indian/Reunion',
    SN: 'Africa/Dakar',
    ST: 'Africa/Sao_Tome',
    SV: 'America/El_Salvador',
    TD: 'Africa/Ndjamena',
    TG: 'Africa/Lome',
    TL: 'Asia/Dili',
    TN: 'Africa/Tunis',
    US: 'America/Adak America/Anchorage America/Atka America/Boise America/Chicago America/Denver America/Detroit America/Fort_Wayne America/Indiana/Indianapolis America/Indiana/Knox America/Indiana/Marengo America/Indiana/Petersburg America/Indiana/Tell_City America/Indiana/Vevay America/Indiana/Vincennes America/Indiana/Winamac America/Indianapolis America/Juneau America/Kentucky/Louisville America/Kentucky/Monticello America/Knox_IN America/Los_Angeles America/Louisville America/Menominee America/Metlakatla America/New_York America/Nome America/North_Dakota/Beulah America/North_Dakota/Center America/North_Dakota/New_Salem America/Phoenix America/Shiprock America/Sitka America/Yakutat Pacific/Honolulu Pacific/Johnston US/Alaska US/Aleutian US/Arizona US/Central US/East-Indiana US/Eastern US/Hawaii US/Indiana-Starke US/Michigan US/Mountain US/Pacific',
    UY: 'America/Montevideo',
    VE: 'America/Caracas',
    WF: 'Pacific/Wallis',
    YT: 'Indian/Mayotte',
  };
  // país → idiomas (o primeiro é o padrão; quando o país tem mais de um, vale o do navegador, se for um deles)
  var IDIOMAS_PAIS = { BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt', ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es en', GQ: 'es fr pt', DE: 'de', AT: 'de', LI: 'de', CH: 'de fr', FR: 'fr', MC: 'fr', BE: 'fr de', LU: 'fr de', CA: 'en fr', HT: 'fr', SN: 'fr', CI: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', TG: 'fr', BJ: 'fr', GA: 'fr', CG: 'fr', CD: 'fr', CM: 'fr en', MG: 'fr', GN: 'fr', CF: 'fr', TD: 'fr', BI: 'fr', DJ: 'fr', KM: 'fr', MA: 'fr', DZ: 'fr', TN: 'fr', GF: 'fr', GP: 'fr', MQ: 'fr', RE: 'fr', YT: 'fr', PF: 'fr', NC: 'fr', PM: 'fr', WF: 'fr', BL: 'fr', MF: 'fr', US: 'en es' };
  var FUSOS = {};
  Object.keys(POR_PAIS).forEach(function (p) { POR_PAIS[p].split(' ').forEach(function (z) { FUSOS[z] = p; }); });

  function fuso() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  function pais(tz) { return FUSOS[tz] || null; }
  // um fuso de verdade (Região/Cidade), fora da tabela: a pessoa está num país de outro idioma
  function fusoEstrangeiro(tz) { return /^[A-Z][A-Za-z_-]+\/[A-Za-z]/.test(tz || '') && !/^Etc\//.test(tz) && !FUSOS[tz]; }

  /** Idioma para quem está no fuso `tz`, com o navegador em `langs`, entre os `suportados`.
   *  Devolve { idioma, pais, fonte }: fonte 'local' (pelo país) ou 'navegador'. */
  function escolher(tz, langs, suportados) {
    var ok = function (l) { l = String(l || '').slice(0, 2).toLowerCase(); return suportados.indexOf(l) >= 0 ? l : null; };
    var nav = null;
    for (var i = 0; i < (langs || []).length && !nav; i++) nav = ok(langs[i]);
    var p = pais(tz);
    if (p) {
      var lista = IDIOMAS_PAIS[p].split(' ').filter(function (l) { return suportados.indexOf(l) >= 0; });
      if (lista.length) return { idioma: lista.indexOf(nav) >= 0 ? nav : lista[0], pais: p, fonte: 'local' };
    }
    if (fusoEstrangeiro(tz)) return { idioma: nav || 'en', pais: null, fonte: 'local' };
    return { idioma: nav || 'pt', pais: null, fonte: 'navegador' };
  }
  function detectar(suportados) {
    var langs = typeof navigator !== 'undefined' ? (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) : [];
    return escolher(fuso(), langs, suportados || ['pt', 'en', 'es', 'fr', 'de']);
  }
  var api = { escolher: escolher, detectar: detectar, fuso: fuso, pais: pais };
  g.IdiomaLocal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
