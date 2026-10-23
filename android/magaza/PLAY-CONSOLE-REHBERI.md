# Ezoter.ist — Google Play'e yükleme rehberi

Uygulama: **Ezoter.ist** · paket adı **`ist.ezoter.app`** (Play'e yüklendikten sonra değişmez)
Tür: siteyi adres çubuğu olmadan açan Android uygulaması (Trusted Web Activity). Sitedeki her
değişiklik uygulamada anında görünür; yalnız simge, ad gibi şeyler değişince yeni sürüm yüklenir.

## 1. Geliştirici hesabı (Murat)

1. https://play.google.com/console → **Kuruluş** (organization) hesabı.
2. D-U-N-S numarası: Play Console başvuru sırasında yönlendirir (ücretsiz, birkaç gün).
3. Bir kerelik 25 $ kayıt ücreti, kimlik ve kuruluş doğrulaması.

## 2. Paketi imzala (Murat, bu Mac'te, Terminal)

```
~/Documents/ezoterist/android/imzala.sh
```

- İlk seferde **yükleme anahtarı** oluşturur ve şifre sorar. Şifreyi not et.
- `android/ezoterist-yukleme.keystore` dosyasının bir yedeğini güvenli bir yere al.
- Sonuç: `android/ezoterist-imzali.aab` + yükleme anahtarının SHA-256 parmak izi.

Play App Signing açık olacağı için uygulamayı asıl imzalayan anahtarı Google saklar. Yükleme
anahtarı kaybolursa Play Console'dan sıfırlama istenebilir.

## 3. Uygulamayı oluştur (Play Console)

- **Uygulama oluştur:** Ad "Ezoter.ist", varsayılan dil Türkçe, Uygulama, Ücretsiz.
- **Test ve yayın → Üretim → Yeni sürüm:** `ezoterist-imzali.aab` yükle.
  Play App Signing'i kabul et. Sürüm notu: "İlk sürüm".
- **Uygulama bütünlüğü → Uygulama imzalama:** "Uygulama imzalama anahtarı sertifikası"ndaki
  **SHA-256** değerini kopyala → ezoter.ist/yonetim → Ayarlar → **Android uygulaması → İmza parmak izi (Play uygulama imzalama)**.
  Bu yapılmazsa uygulamada üstte adres çubuğu görünür.

## 4. Mağaza girişi (Ana mağaza girişi)

**Uygulama adı (30):** Ezoter.ist: Tarot, Astroloji

**Kısa açıklama (80):**
Tarot, kahve falı, astroloji ve numeroloji: yapay zekâ ile ücretsiz yorumlar

**Tam açıklama (4000):**

Ezoter.ist; astroloji, tarot, numeroloji, rüya yorumu, kahve falı, el falı ve daha pek çok ezoterik konuda yapay zekâ ile kişisel yorumlar sunan ücretsiz bir eğlence ve kendini keşfetme uygulamasıdır. Üyelik gerekmez, hiçbir yorum için ücret alınmaz.

✨ NELER VAR
• Astroloji: bugünün gökyüzü, 12 burç ve günlük burç yorumları
• Doğum haritası: gerçek gök hesabıyla Güneş, Ay ve yükselen burcun
• Tarot: 78 kartlık özel destemizle günün kartı, aşk açılımı ve Kelt Haçı
• Kahve falı: fincanının fotoğrafını çek, telvedeki şekiller yorumlansın
• El falı ve yüz okuma: avucunun ya da yüzünün fotoğrafından sembolik yorum
• Rüya yorumu: geleneksel ve psikolojik yorum, rüyanın resmi
• Numeroloji: yaşam yolu, kader ve ruh güdüsü sayıların
• Melek sayıları: 111, 222, 1111 gibi tekrar eden sayıların anlamı
• Aşk uyumu, I Ching, rün taşları, ay takvimi, çakralar ve rehberli çakra meditasyonu
• Kristaller, semboller, ebced ve cifir hesabı, taşlarla dizim, yüz müziği
• Ezoterik Rehber: burçlar, tarot kartları, rünler, kristaller ve sembollerin anlamları

🔒 GİZLİLİK
Hesap açman gerekmez. Girdiğin bilgiler, yüklediğin fotoğraflar ve yorumların kaydedilmez; yorum yalnızca uygulamayı kullandığın sürece görüntülenir.

🎁 ÜCRETSİZ
Bütün yorumlar ücretsizdir. Herkesin yararlanabilmesi için günlük kullanım sınırı vardır.

ℹ️ ÖNEMLİ
İçerikler eğlence, ilham ve kişisel farkındalık amaçlıdır; bilimsel bir dayanağı yoktur ve tıbbi, psikolojik, hukuki ya da mali tavsiye yerine geçmez. Yorumları bir falcı ya da danışman değil, yapay zekâ hazırlar.

**Görseller** (bu klasörde):
- Uygulama simgesi 512×512: `play-simge-512.png`
- Öne çıkan görsel 1024×500: `play-tanitim-1024x500.png`
- Telefon ekran görüntüleri (1080×1920): `ekranlar/1-ana-menu.png` … `6-akrep-burcu.png`

**Kategori:** Yaşam tarzı (Lifestyle) · **Etiketler:** Astroloji, Eğlence
**İletişim:** bilgi@ezoter.ist · web sitesi https://ezoter.ist
**Gizlilik politikası:** https://ezoter.ist/gizlilik

## 5. Uygulama içeriği formları — hazır cevaplar

**Uygulama erişimi:** Tüm işlevler özel erişim gerektirmez (giriş yok).

**Reklamlar:** Evet, uygulama reklam içeriyor (Google AdSense, onaylanınca).

**İçerik derecelendirmesi (IARC anketi):** Kategori "Eğlence" ya da "Referans/Eğitim dışı diğer".
Şiddet, cinsellik, küfür, uyuşturucu, kumar: **Hayır**. Kullanıcılar arası iletişim: **Hayır**.
Kullanıcı konumu paylaşımı: **Hayır**. Dijital ürün satışı: **Hayır**.

**Hedef kitle:** 18 yaş ve üzeri (yalnız 18+ seç). Çocuklara yönelik değil.

**Haber uygulaması:** Hayır. **Sağlık uygulaması:** Hayır. **Finans:** Hayır. **Devlet:** Hayır.

**Veri güvenliği (Data safety):**
- Veri topluyor ya da paylaşıyor mu: **Evet**. Aktarımda şifreli: **Evet** (HTTPS).
- Kullanıcı verilerin silinmesini isteyebilir mi: veriler saklanmadığı için "otomatik silinir" açıklaması.
- **Fotoğraflar** (kahve falı, el falı, yüz okuma, fotoğraf analizi): Toplanıyor · paylaşılmıyor ·
  **geçici olarak işleniyor** (ephemeral) · isteğe bağlı · amaç: Uygulama işlevselliği.
- **Kişisel bilgiler → Ad** (numeroloji, ebced için yazılan isim) ve **Diğer bilgiler** (doğum tarihi/saati/yeri):
  Toplanıyor · paylaşılmıyor · geçici işleniyor · isteğe bağlı · Uygulama işlevselliği.
- **Uygulama etkinliği → Diğer kullanıcı içeriği** (rüya metni, sorular): Toplanıyor · paylaşılmıyor ·
  geçici işleniyor · isteğe bağlı · Uygulama işlevselliği.
- **Cihaz veya diğer kimlikler** (rastgele ziyaretçi çerezi; reklam kimliği): Toplanıyor · reklam için
  Google ile **paylaşılıyor** · zorunlu · amaç: Uygulama işlevselliği (günlük sınır), Reklam.
- Konum, kişiler, finans, sağlık, mesajlar, ses, dosyalar, takvim: **Toplanmıyor**.
