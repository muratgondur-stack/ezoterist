# Ezoter.ist

Modern, tek sayfalık bir web uygulaması.

## İçerik

- Tam ekran arka plan görseli üzerine kurulu sade bir açılış sayfası
- "Videoyu Aç" butonuyla açılıp kapanan video paneli
- Ekran yönüne göre otomatik olarak dikey ya da yatay video kaynağı seçimi
- `/login` ve `/register` adreslerinde "Ezoter.ist Girişi" sayfası: e-posta ile kayıt/giriş, Google ile giriş ve "Şifremi unuttum" (e-postaya 6 haneli kod)

## Çalıştırma

Node.js 20 veya üzeri ile:

```bash
npm start
```

Sunucu `PORT` değişkenini kullanır (varsayılan `3000`) ve `0.0.0.0` adresinde dinler. Ortam değişkenlerini bir `.env` dosyasına yazıp ek paket olmadan şöyle başlatabilirsiniz:

```bash
node --env-file=.env server.js
```

## Giriş ve kayıt

Ek paket gerektirmez. Kullanıcılar `data/users.json` dosyasında saklanır (şifreler scrypt ile hashlenir), oturum imzalı bir `HttpOnly` çerezle tutulur.

| Değişken | Açıklama |
| --- | --- |
| `SESSION_SECRET` | Oturum çerezlerini imzalamak için uzun, rastgele bir değer. Tanımlanmazsa her yeniden başlatmada oturumlar düşer. |
| `DATA_DIR` | Kullanıcı dosyasının klasörü (varsayılan `./data`). Deploy sırasında silinmemesi için proje dışında bir klasör verin (ör. `/var/lib/ezoterist`); Docker'da bu klasörü volume olarak bağlayın. |
| `EPOSTA_TOKEN` | Şifre yenileme kodlarını göndermek için Cloudflare API tokenı ("Email Sending: Edit" yetkili). Tanımlı değilse üretimde kod gönderilemez; geliştirmede kod sunucu loguna yazılır. |
| `EPOSTA_GONDEREN` | İsteğe bağlı gönderen. Varsayılan `Ezoter.ist <bilgi@ezoter.ist>`. |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). |
| `GOOGLE_CLIENT_SECRET` | Aynı OAuth istemcisinin gizli anahtarı. |
| `GOOGLE_REDIRECT_URI` | İsteğe bağlı. Varsayılan `https://<alan-adı>/auth/google/callback`; bu adresi Google'da "Authorized redirect URIs" listesine ekleyin. |

Google değişkenleri tanımlı değilse "Google ile giriş yap" butonu kullanıcıyı bilgilendirici bir mesajla giriş sayfasına geri döndürür.

### E-posta (quiz.ist ile aynı yöntem)

E-postalar Cloudflare Email Service SMTP relay'i (`smtp.mx.cloudflare.net:465`, kullanıcı adı `api_token`) üzerinden, paket eklemeden yazılmış küçük bir SMTP istemcisiyle (`eposta.js`) gönderilir. Kurulum:

1. Cloudflare → ezoter.ist alan adı → **Email → Email Sending** bölümünden gönderimi etkinleştirin; SPF/DKIM/DMARC kayıtlarını Cloudflare'in önerdiği şekilde ekleyin.
2. Cloudflare → My Profile → API Tokens'tan **Email Sending: Edit** yetkili bir token oluşturun.
3. Bu tokenı sunucuda `EPOSTA_TOKEN` değişkeni olarak tanımlayın. Sunucudan dışarıya 465 portunun açık olduğundan emin olun (`nc -vz smtp.mx.cloudflare.net 465`).

Kayıt akışı: ad, e-posta ve şifre girilince e-postaya 6 haneli doğrulama kodu gider; hesap ancak kod doğrulanınca açılır ve hoş geldin e-postası gönderilir.

Şifremi unuttum akışı: e-postaya 6 haneli kod gider (10 dakika geçerli, 1 dakikada bir istenebilir, en fazla 5 deneme). Kod ve yeni şifre girilince şifre güncellenir, eski oturumlar kapanır ve kullanıcı giriş yapmış olur.
