# Tamarix

Tamarix, bir web sitesinin temel güvenlik ve yapılandırma problemlerini **güvenli, pasif** kontrollerle tarayıp anlaşılır bir rapor üreten bir web uygulamasıdır.

Kullanıcı bir URL girer (`https://example.com`), Tamarix siteye zarar vermeyen HTTP istekleri gönderir, sonuçları sabit ağırlıklara göre puanlar ve Claude API'yi yalnızca **sonuçları yorumlamak** için kullanarak okunabilir bir rapor oluşturur.

> **Bu araç bir penetration testing / saldırı aracı DEĞİLDİR.** Brute force, exploit çalıştırma, SQL injection/XSS denemesi, DDoS, port/directory taraması veya kimlik bilgisi denemesi yapmaz. Yalnızca herkese açık, pasif HTTP kontrolleri gerçekleştirir. Ayrıntılar için [Güvenlik Sınırları](#güvenlik-sınırları) bölümüne bakın.

## Özellikler

- Tek bir URL girerek anında tarama başlatma
- 0-100 arası, **sabit ve kod içinde tanımlı ağırlıklarla** hesaplanan bir Security Score
- PASS / WARNING / FAIL durumlarıyla kontrol kartları
- Önem derecesine göre (HIGH/MEDIUM/LOW/PASS) sıralanmış bulgular ve öneriler
- Claude tarafından üretilen, teknik sonuçları yorumlayan kısa bir AI özeti
- Aynı URL için sonuçların veritabanında önbelleklenmesi (varsayılan: 1 saat) — gereksiz AI çağrısı ve gereksiz tarama yapılmaz
- Geçmiş taramaların listelenmesi

## Güvenlik Kontrolleri

| Kategori | Ağırlık | Neler kontrol edilir |
|---|---|---|
| HTTPS | 25 | HTTPS erişilebilirliği, TLS bağlantısı, HTTP→HTTPS yönlendirmesi |
| Security Headers | 30 | `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Cookies | 15 | `Secure`, `HttpOnly`, `SameSite` bayrakları |
| Information Disclosure | 10 | `Server` / `X-Powered-By` header'ları, HTML `generator` meta etiketi, açık hata/debug izleri |
| Exposure Checks | 10 | `robots.txt`, `sitemap.xml`, `.well-known/security.txt` varlığı (yalnızca bu sabit dosyalar; brute force yok) |
| HTTP Methods | 10 | `OPTIONS` isteğiyle `Allow` header'ının pasif okunması |

Her kategori PASS ise tam ağırlığını, WARNING ise yarısını, FAIL ise sıfır puan kazanır. Ağırlıklar [`src/lib/scoring.ts`](src/lib/scoring.ts) içinde açıkça tanımlıdır — skor rastgele veya yapay olarak üretilmez.

## Kullanılan Teknolojiler

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **PostgreSQL** + **Prisma**
- **Claude API** (`@anthropic-ai/sdk`) — yalnızca rapor özetleme için
- **Vitest** — birim testleri

## Kurulum

### Gereksinimler

- Node.js 20+
- Bir PostgreSQL veritabanı (yerel veya barındırılan)
- Bir Claude API anahtarı

```bash
npm install
```

### Environment Variables

`.env.example` dosyasını `.env` olarak kopyalayıp doldurun:

```bash
cp .env.example .env
```

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi (`postgresql://user:pass@host:5432/db?schema=public`) |
| `ANTHROPIC_API_KEY` | Claude API anahtarı ([console.anthropic.com](https://console.anthropic.com/)) |
| `ANTHROPIC_MODEL` | (opsiyonel) kullanılacak model, varsayılan `claude-sonnet-5` |

### PostgreSQL Kurulumu

Yerelde hızlıca bir PostgreSQL örneği çalıştırmak için Docker kullanabilirsiniz:

```bash
docker run --name tamarix-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=siteguard -p 5432:5432 -d postgres:16
```

Ardından şemayı veritabanına uygulayın:

```bash
npm run db:migrate
```

### Claude API Kurulumu

1. [console.anthropic.com](https://console.anthropic.com/) adresinden bir API anahtarı oluşturun.
2. `.env` dosyasındaki `ANTHROPIC_API_KEY` değerine yapıştırın.
3. API anahtarı olmadan da uygulama çalışır — bu durumda tarama sonuçları üretilir ancak AI özeti yerine "AI özeti oluşturulamadı" mesajı gösterilir; uygulama çökmez.

## Development

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Production Build

```bash
npm run build
npm run start
```

## Test, Lint, Typecheck

```bash
npm run test        # Vitest birim testleri
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

## Mimari

```
src/
  app/
    page.tsx                → Ana sayfa (URL formu + geçmiş taramalar)
    scan/[id]/page.tsx       → Tarama sonucu dashboard'u
    api/scan/route.ts        → POST: yeni tarama başlat, GET: geçmiş listesi
    api/scan/[id]/route.ts   → Tek bir taramayı getir
  components/                → UI bileşenleri (ScoreGauge, CheckCard, FindingCard, ...)
  lib/
    url-validation.ts        → SSRF koruması (protokol, DNS, IP aralığı doğrulama)
    safe-fetch.ts             → Zaman aşımı + boyut sınırı + redirect doğrulamalı fetch sarmalayıcı
    scanner/                  → Her kontrol kategorisi için ayrı, pasif modül
    scoring.ts                 → Sabit ağırlıklı, deterministik skor hesaplama
    findings.ts                 → Ham kontrol sonuçlarından kullanıcıya gösterilecek bulguları üretir
    ai-summary.ts                → Claude API çağrısı + JSON şema doğrulama
    scan-service.ts               → Önbellekleme, tarama orkestrasyonu, veritabanı kalıcılığı
prisma/schema.prisma            → Scan ve Finding modelleri
```

Akış: `URL girildi → SSRF doğrulaması → önbellek kontrolü → pasif HTTP kontrolleri → skor hesaplama → bulgu üretimi → (varsa) Claude ile özetleme → veritabanına kaydetme → dashboard`.

## Güvenlik Sınırları

Tamarix **kesinlikle** şunları yapmaz:

- Brute force, şifre/kimlik bilgisi denemesi
- Exploit çalıştırma, SQL injection / XSS payload gönderme, command injection
- DDoS veya yoğun/agresif tarama
- Port taraması veya directory brute force
- CAPTCHA veya rate-limit bypass
- Kullanıcının belirttiği hedef üzerinden iç ağlara veya `localhost`'a erişim (SSRF koruması: [`src/lib/url-validation.ts`](src/lib/url-validation.ts) her isteği ve her redirect adımını protokol, hostname ve çözümlenen IP adresi bazında doğrular; loopback, private, link-local, CGNAT ve bulut metadata adresleri reddedilir)

Bu araç bir **penetration testing aracı değildir**. Yalnızca herkese açık olarak zaten erişilebilen bilgileri (HTTP header'ları, cookie bayrakları, sabit dosyalar) pasif şekilde okur ve yorumlar. Bulunan zafiyetleri doğrulamak veya istismar etmek için tasarlanmamıştır.

## Gelecek Özellikler

- Kullanıcı hesabı sistemi ile taramaların kişiye özel geçmişi
- Zamanlanmış/periyodik tekrar taramalar ve regresyon takibi
- PDF/CSV rapor dışa aktarımı
- Ek pasif kontroller (DNS CAA kaydı, e-posta güvenliği — SPF/DMARC)
