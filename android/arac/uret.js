// Ezoter.ist Android (TWA) projesini https://ezoter.ist/manifest.json'dan üretir → ../twa
// Çalıştırma: node uret.js   (proje varsa üzerine yazar; imza anahtarı burada oluşturulmaz)
const path = require("node:path");
const { TwaManifest, TwaGenerator, ConsoleLog } = require("@bubblewrap/core");

(async () => {
  const log = new ConsoleLog("uret");
  const hedef = path.resolve(__dirname, "../twa");
  const m = await TwaManifest.fromWebManifest("https://ezoter.ist/manifest.json");
  Object.assign(m, {
    packageId: "ist.ezoter.app",
    host: "ezoter.ist",
    name: "Ezoter.ist",
    launcherName: "Ezoter.ist",
    startUrl: "/?kaynak=uygulama",
    themeColor: m.themeColor, backgroundColor: m.backgroundColor, navigationColor: m.themeColor,
    display: "standalone",
    orientation: "default",
    minSdkVersion: 24, // androidbrowserhelper 2.7+ en az 24 ister
    appVersionCode: 1,
    appVersionName: "1.0.0",
    enableNotifications: false,
    fallbackType: "customtabs",
    enableSiteSettingsShortcut: false,
    signingKey: { path: path.resolve(__dirname, "../ezoterist-yukleme.keystore"), alias: "ezoterist" },
  });
  await new TwaGenerator().createTwaProject(hedef, m, log);
  await m.saveToFile(path.join(hedef, "twa-manifest.json"));
  log.info(`Proje hazır: ${hedef}`);
})().catch((e) => { console.error(e); process.exit(1); });
