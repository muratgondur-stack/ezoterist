# Ezoter.ist

Modern, tek sayfalık bir web uygulaması.

## İçerik

- Tam ekran arka plan görseli üzerine kurulu sade bir açılış sayfası
- "Videoyu Aç" butonuyla açılıp kapanan video paneli
- Ekran yönüne göre otomatik olarak dikey ya da yatay video kaynağı seçimi
- `/login` ve `/register` adreslerinde "Ezoter.ist Girişi" sayfası: e-posta ile kayıt/giriş ve Google ile giriş

## Çalıştırma

Node.js 20 veya üzeri ile:

```bash
npm start
```

Sunucu, Railway'in otomatik olarak verdiği `PORT` değişkenini kullanır ve `0.0.0.0` adresinde dinler. Railway üzerinde ayrıca özel bir komut tanımlamanız gerekmez; `npm start` otomatik olarak çalışır.

## Giriş ve kayıt

Ek paket gerektirmez. Kullanıcılar `data/users.json` dosyasında saklanır (şifreler scrypt ile hashlenir), oturum imzalı bir `HttpOnly` çerezle tutulur.

| Değişken | Açıklama |
| --- | --- |
| `SESSION_SECRET` | Oturum çerezlerini imzalamak için uzun, rastgele bir değer. Tanımlanmazsa her yeniden başlatmada oturumlar düşer. |
| `DATA_DIR` | Kullanıcı dosyasının klasörü (varsayılan `./data`). Railway'de kalıcı olması için bir Volume bağlayıp yolunu buraya yazın. |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). |
| `GOOGLE_CLIENT_SECRET` | Aynı OAuth istemcisinin gizli anahtarı. |
| `GOOGLE_REDIRECT_URI` | İsteğe bağlı. Varsayılan `https://<alan-adı>/auth/google/callback`; bu adresi Google'da "Authorized redirect URIs" listesine ekleyin. |

Google değişkenleri tanımlı değilse "Google ile giriş yap" butonu kullanıcıyı bilgilendirici bir mesajla giriş sayfasına geri döndürür.
