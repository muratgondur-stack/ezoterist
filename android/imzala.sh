#!/bin/bash
# Ezoter.ist Android paketini derler ve imzalar → android/ezoterist-imzali.aab (Play Console'a bu yüklenir).
# İlk çalıştırmada yükleme anahtarını (ezoterist-yukleme.keystore) oluşturur; şifreyi Murat belirler.
# Anahtar ve şifre ASLA GitHub'a gitmez (.gitignore). Anahtarın bir yedeğini güvenli bir yere al.
set -euo pipefail
cd "$(dirname "$0")"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
KS=ezoterist-yukleme.keystore

if [ ! -f "$KS" ]; then
  echo "== Yükleme anahtarı oluşturuluyor =="
  echo "Bir şifre belirle (en az 6 karakter) ve iki kez yaz. Bu şifreyi bir yere not et."
  "$JAVA_HOME/bin/keytool" -genkeypair -v -keystore "$KS" -alias ezoterist -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Ezoter.ist, O=VUCUT DESTEK SISTEM MEDIKAL TIC. LTD. STI., L=Istanbul, C=TR"
fi

echo "== Paket derleniyor =="
(cd twa && echo "sdk.dir=$ANDROID_HOME" > local.properties && ./gradlew --no-daemon -q bundleRelease)
cp twa/app/build/outputs/bundle/release/app-release.aab ezoterist-imzali.aab

echo "== Paket imzalanıyor (anahtar şifresini sor) =="
"$JAVA_HOME/bin/jarsigner" -keystore "$KS" -sigalg SHA256withRSA -digestalg SHA-256 ezoterist-imzali.aab ezoterist
"$JAVA_HOME/bin/jarsigner" -verify ezoterist-imzali.aab | grep -E "verified|doğrulandı" || { echo "İMZA DOĞRULANAMADI"; exit 1; }

echo
echo "== Yükleme anahtarının SHA-256 parmak izi (şifreyi bir kez daha sor) =="
"$JAVA_HOME/bin/keytool" -list -v -keystore "$KS" -alias ezoterist | grep "SHA256:"
echo
echo "Hazır: $(pwd)/ezoterist-imzali.aab → Play Console'a bunu yükle."
echo "Yukarıdaki SHA256 değerini Claude'a ver ya da ezoter.ist/yonetim → Ayarlar → Android uygulaması → 'yükleme anahtarı' kutusuna yapıştır."
