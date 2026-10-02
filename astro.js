// Gök hesapları (tarayıcı + sunucu): Güneş ve Ay Meeus'un kısaltılmış serileriyle, gezegenler JPL'in
// yaklaşık yörünge öğeleriyle (1800–2050, ~1° içinde). Boylamlar tarihin ekliptiğine göre (tropikal zodyak).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Astro = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const RAD = Math.PI / 180;
  const norm = (deg) => ((deg % 360) + 360) % 360;
  const sin = (deg) => Math.sin(deg * RAD);
  const cos = (deg) => Math.cos(deg * RAD);

  const julianDay = (date) => date.getTime() / 86400000 + 2440587.5;
  const centuries = (jd) => (jd - 2451545.0) / 36525;

  function sunLongitude(jd) {
    const T = centuries(jd);
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
      (0.019993 - 0.000101 * T) * sin(2 * M) +
      0.000289 * sin(3 * M);
    const omega = 125.04 - 1934.136 * T;
    return norm(L0 + C - 0.00569 - 0.00478 * sin(omega));
  }

  // [D, M, M', F, katsayı (1e-6 derece)]
  const MOON_TERMS = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
    [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
    [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
    [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069],
  ];

  function moonLongitude(jd) {
    const T = centuries(jd);
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699;
    const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    let sum = 0;
    for (const [d, m, mp, f, c] of MOON_TERMS) {
      const factor = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
      sum += c * factor * sin(d * D + m * M + mp * Mp + f * F);
    }
    const A1 = 119.75 + 131.849 * T;
    const A2 = 53.09 + 479264.29 * T;
    sum += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    return norm(Lp + sum / 1e6);
  }

  // JPL yaklaşık öğeler: a, e, I, L, ϖ, Ω ve yüzyıllık değişimleri (J2000 ekliptiği).
  const ELEMENTS = {
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255, 0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
    earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
    mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
    pluto: [39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684, -0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482],
  };

  function heliocentric(name, T) {
    const el = ELEMENTS[name];
    const a = el[0] + el[6] * T;
    const e = el[1] + el[7] * T;
    const I = el[2] + el[8] * T;
    const L = el[3] + el[9] * T;
    const peri = el[4] + el[10] * T;
    const node = el[5] + el[11] * T;
    const w = peri - node;
    const M = norm(L - peri);
    let E = M + (e / RAD) * sin(M);
    for (let i = 0; i < 12; i += 1) {
      const dE = (M - (E - (e / RAD) * sin(E))) / (1 - e * cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    const xp = a * (cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * sin(E);
    return {
      x: (cos(w) * cos(node) - sin(w) * sin(node) * cos(I)) * xp + (-sin(w) * cos(node) - cos(w) * sin(node) * cos(I)) * yp,
      y: (cos(w) * sin(node) + sin(w) * cos(node) * cos(I)) * xp + (-sin(w) * sin(node) + cos(w) * cos(node) * cos(I)) * yp,
      z: sin(w) * sin(I) * xp + cos(w) * sin(I) * yp,
    };
  }

  function planetLongitude(name, jd) {
    const T = centuries(jd);
    const p = heliocentric(name, T);
    const earth = heliocentric("earth", T);
    const lon = Math.atan2(p.y - earth.y, p.x - earth.x) / RAD;
    return norm(lon + 1.3969713 * T); // J2000 → tarihin ekinoksu (presesyon)
  }

  const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

  function longitudeOf(body, jd) {
    if (body === "sun") return sunLongitude(jd);
    if (body === "moon") return moonLongitude(jd);
    return planetLongitude(body, jd);
  }

  const SIGN_KEYS = ["koc", "boga", "ikizler", "yengec", "aslan", "basak", "terazi", "akrep", "yay", "oglak", "kova", "balik"];
  const signOf = (lon) => SIGN_KEYS[Math.floor(norm(lon) / 30)];
  const degreeInSign = (lon) => norm(lon) % 30;

  function positions(date) {
    const jd = julianDay(date);
    return BODIES.map((body) => {
      const lon = longitudeOf(body, jd);
      let retro = false;
      if (body !== "sun" && body !== "moon") {
        const delta = norm(longitudeOf(body, jd + 0.5) - longitudeOf(body, jd - 0.5) + 180) - 180;
        retro = delta < 0;
      }
      return { body, lon, sign: signOf(lon), degree: degreeInSign(lon), retro };
    });
  }

  // Ay'ın evresi: Güneş'ten uzaklaşma açısı (0 = yeni ay, 180 = dolunay).
  function moonPhase(date) {
    const jd = julianDay(date);
    const elongation = norm(moonLongitude(jd) - sunLongitude(jd));
    const illumination = (1 - cos(elongation)) / 2;
    const index = Math.floor(norm(elongation + 22.5) / 45);
    const names = ["Yeni Ay", "Büyüyen Hilal", "İlk Dördün", "Büyüyen Ay", "Dolunay", "Küçülen Ay", "Son Dördün", "Küçülen Hilal"];
    const icons = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
    return { elongation, illumination, name: names[index], icon: icons[index], waxing: elongation < 180 };
  }

  // Bir sonraki yeni ay / dolunay anı (hedef açıya ikiye bölme ile yaklaşır).
  function nextPhase(date, target) {
    const jd0 = julianDay(date);
    const elong = (jd) => norm(moonLongitude(jd) - sunLongitude(jd));
    const ahead = (jd) => norm(target - elong(jd));
    let lo = jd0;
    let hi = jd0 + (ahead(jd0) / 360) * 29.53 + 2;
    // ahead küçülerek 0'a iner, sonra 360'a sıçrar; sıçramayı bul.
    for (let i = 0; i < 40; i += 1) {
      const mid = (lo + hi) / 2;
      if (ahead(mid) > ahead(lo) + 1e-9 || ahead(mid) > 180) hi = mid;
      else lo = mid;
    }
    return new Date((hi - 2440587.5) * 86400000);
  }

  function obliquity(jd) {
    return 23.439291 - 0.0130042 * centuries(jd);
  }

  function siderealDegrees(jd, longitudeEast) {
    const T = centuries(jd);
    const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - (T * T * T) / 38710000;
    return norm(gmst + longitudeEast);
  }

  // Yükselen ve Tepe Noktası (MC): doğum anı (UTC Date), enlem, doğu boylamı.
  function angles(date, latitude, longitudeEast) {
    const jd = julianDay(date);
    const theta = siderealDegrees(jd, longitudeEast);
    const eps = obliquity(jd);
    const asc = norm(Math.atan2(cos(theta), -(sin(theta) * cos(eps) + Math.tan(latitude * RAD) * sin(eps))) / RAD);
    const mc = norm(Math.atan2(sin(theta), cos(theta) * cos(eps)) / RAD);
    return { asc, mc };
  }

  // Yerel saat (IANA saat dilimi) → UTC. Tarihî yaz saati değişiklikleri Intl'den gelir.
  function localToUtc(year, month, day, hour, minute, timeZone) {
    const guess = Date.UTC(year, month - 1, day, hour, minute);
    const offsetAt = (ms) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(new Date(ms));
      const get = (type) => Number(parts.find((p) => p.type === type).value);
      return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - ms;
    };
    let utc = guess - offsetAt(guess);
    utc = guess - offsetAt(utc);
    return new Date(utc);
  }

  // İki burç arasındaki açı ilişkisi (burç bazında).
  function aspectBetween(signA, signB) {
    const diff = (SIGN_KEYS.indexOf(signB) - SIGN_KEYS.indexOf(signA) + 12) % 12;
    const dist = Math.min(diff, 12 - diff);
    return ["kavusum", "yarim-altmislik", "altmislik", "kare", "ucgen", "yarim-karsit", "karsit"][dist];
  }

  return {
    julianDay, sunLongitude, moonLongitude, planetLongitude, longitudeOf, positions, moonPhase, nextPhase,
    angles, localToUtc, signOf, degreeInSign, aspectBetween, SIGN_KEYS, BODIES, norm,
  };
});
