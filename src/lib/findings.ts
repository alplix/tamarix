import type { Finding, ScanChecks } from "./types";

const HEADER_RECOMMENDATIONS: Record<string, string> = {
  "Content-Security-Policy": "Uygulamanıza özel, gereksiz joker karakter (*) ve 'unsafe-inline' içermeyen bir Content-Security-Policy tanımlayın.",
  "Strict-Transport-Security": "HTTPS kullanan production sitelerde 'max-age=31536000; includeSubDomains' gibi uygun bir HSTS politikası yapılandırın.",
  "X-Content-Type-Options": "Yanıtlara 'X-Content-Type-Options: nosniff' header'ı ekleyin.",
  "X-Frame-Options": "Yanıtlara 'X-Frame-Options: DENY' veya CSP'de 'frame-ancestors' yönergesi ekleyin.",
  "Referrer-Policy": "'Referrer-Policy: strict-origin-when-cross-origin' gibi bir politika tanımlayın.",
  "Permissions-Policy": "Kullanılmayan tarayıcı özelliklerini kısıtlamak için bir Permissions-Policy tanımlayın.",
};

function severityForHeader(header: string, status: "WARNING" | "FAIL"): Finding["severity"] {
  const highImpact = ["Content-Security-Policy", "Strict-Transport-Security"];
  if (highImpact.includes(header)) return status === "FAIL" ? "HIGH" : "MEDIUM";
  return status === "FAIL" ? "MEDIUM" : "LOW";
}

export function buildFindings(checks: ScanChecks): Finding[] {
  const findings: Finding[] = [];

  // HTTPS
  if (!checks.https.httpsReachable || !checks.https.tlsValid) {
    findings.push({
      category: "HTTPS",
      severity: "HIGH",
      title: "HTTPS kullanılamıyor",
      description: "Site HTTPS üzerinden güvenilir şekilde erişilemez durumda ya da TLS bağlantısı kurulamadı.",
      recommendation: "Geçerli bir TLS sertifikası ile HTTPS'i etkinleştirin ve sertifikanın güncel olduğundan emin olun.",
    });
  } else if (!checks.https.httpRedirectsToHttps) {
    findings.push({
      category: "HTTPS",
      severity: "MEDIUM",
      title: "HTTP, HTTPS'e yönlendirilmiyor",
      description: "Site HTTPS destekliyor ancak düz HTTP istekleri otomatik olarak HTTPS'e yönlendirilmiyor.",
      recommendation: "Sunucu veya yük dengeleyici seviyesinde tüm HTTP isteklerini HTTPS'e yönlendiren bir kural ekleyin.",
    });
  } else {
    findings.push({
      category: "HTTPS",
      severity: "PASS",
      title: "HTTPS doğru yapılandırılmış",
      description: "Site HTTPS üzerinden erişilebilir ve HTTP istekleri HTTPS'e yönlendiriliyor.",
      recommendation: "Mevcut yapılandırmayı koruyun.",
    });
  }

  // Security headers
  for (const check of checks.headers.checks) {
    if (check.status === "PASS") {
      findings.push({
        category: "Security Headers",
        severity: "PASS",
        title: `${check.header}`,
        description: "Header mevcut ve doğru yapılandırılmış.",
        recommendation: "Mevcut yapılandırmayı koruyun.",
      });
      continue;
    }
    findings.push({
      category: "Security Headers",
      severity: severityForHeader(check.header, check.status),
      title: check.value ? `Zayıf ${check.header} yapılandırması` : `Eksik ${check.header}`,
      description: check.reason,
      recommendation: HEADER_RECOMMENDATIONS[check.header] ?? "Bu header için güvenli bir değer yapılandırın.",
    });
  }

  // Cookies
  if (checks.cookies.cookieCount === 0) {
    findings.push({
      category: "Cookies",
      severity: "PASS",
      title: "Cookie tespit edilmedi",
      description: "Yanıtta herhangi bir Set-Cookie header'ı bulunamadı.",
      recommendation: "Uygulanabilir bir öneri yok.",
    });
  } else {
    for (const cookie of checks.cookies.cookies) {
      if (cookie.issues.length === 0) {
        findings.push({
          category: "Cookies",
          severity: "PASS",
          title: `Cookie "${cookie.name}" güvenli yapılandırılmış`,
          description: "Secure, HttpOnly ve SameSite bayrakları doğru şekilde ayarlanmış.",
          recommendation: "Mevcut yapılandırmayı koruyun.",
        });
      } else {
        findings.push({
          category: "Cookies",
          severity: !cookie.secure || !cookie.httpOnly ? "MEDIUM" : "LOW",
          title: `Cookie "${cookie.name}" eksik güvenlik bayrakları içeriyor`,
          description: cookie.issues.join(" "),
          recommendation: "Cookie'yi Secure, HttpOnly ve uygun bir SameSite değeri ile ayarlayın.",
        });
      }
    }
  }

  // Information disclosure
  if (checks.infoDisclosure.issues.length === 0) {
    findings.push({
      category: "Information Disclosure",
      severity: "PASS",
      title: "Açık teknik bilgi tespit edilmedi",
      description: "Response header'larında veya HTML'de belirgin bir sürüm/hata bilgisi bulunamadı.",
      recommendation: "Uygulanabilir bir öneri yok.",
    });
  } else {
    for (const issue of checks.infoDisclosure.issues) {
      findings.push({
        category: "Information Disclosure",
        severity: "LOW",
        title: "Hassas teknik bilgi açığa çıkıyor",
        description: issue,
        recommendation: "Sunucu/framework header'larını gizleyin ve hata mesajlarının/debug bilgisinin production'da görünmesini engelleyin.",
      });
    }
  }

  // Exposure
  if (!checks.exposure.securityTxt.found) {
    findings.push({
      category: "Exposure",
      severity: "LOW",
      title: "security.txt bulunamadı",
      description: "/.well-known/security.txt dosyası mevcut değil, bu da güvenlik araştırmacılarının açık bildirmesini zorlaştırır.",
      recommendation: "RFC 9116 formatında bir security.txt dosyası yayınlayın.",
    });
  } else {
    findings.push({
      category: "Exposure",
      severity: "PASS",
      title: "security.txt mevcut",
      description: "Site bir security.txt dosyası yayınlıyor.",
      recommendation: "Mevcut yapılandırmayı koruyun.",
    });
  }

  // HTTP methods
  for (const issue of checks.httpMethods.issues) {
    findings.push({
      category: "HTTP Methods",
      severity: "LOW",
      title: "Potansiyel olarak tehlikeli HTTP metodu açık",
      description: issue,
      recommendation: "Sunucu yapılandırmasında kullanılmayan HTTP metodlarını devre dışı bırakın.",
    });
  }

  return findings;
}
