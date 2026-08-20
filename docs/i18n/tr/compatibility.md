[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# Uyumluluk ve destek sınırları

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify, genel CI matrisi üzerinden Ubuntu, macOS ve Windows'ta Node.js 20 ve 24'ü destekler. Node.js 24 birincil sürüm hattıdır. WSL, Linux çalışma zamanı yolunu kullanır; ama host'a özgü sağlayıcı kimlik doğrulaması ve süreç davranışı, gerçek makinede `xerify health` ile kontrol edilmelidir. `0.1.0` sürüm adayının tam kontrolü, temiz kurulum duman testi ve sürüm denetimi de Node.js 24 ile WSL2'de geçmektedir.

## Desteklenen yüzeyler

| Yüzey                 | Sözleşme                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------- |
| CLI                   | İnsan tarafından okunabilir çıktı artı kararlı `--json` zarfları ve belgelenmiş çıkış kodları |
| JavaScript/TypeScript | Paket içine gömülü bildirimlerle ESM paket dışa aktarımları                                   |
| MCP STDIO             | Yerel sunucu, modern ve eski protokol müzakeresi                                              |
| MCP Streamable HTTP   | Varsayılan olarak loopback; loopback dışı bağlama için kimliği doğrulanmış açık katılım       |

Genel JSON/şema sürümü `1`'dir. Uyumlu sürümlerde yalnızca ekleyici, isteğe bağlı alanlar görünebilir; var olan genel bir alanın kaldırılması veya yeniden yorumlanması, uyumluluğu bozan bir sürüm gerektirir.

## Sağlayıcı kanalları

Yerleşik adaptörler; Codex CLI, Claude CLI, Cursor Agent, OpenAI API, Anthropic API, OpenAI uyumlu HTTP ve açıkça yapılandırılmış bir command'ı kapsar. Kullanılabilirlik; seçilen kanala, kurulu çalıştırılabilir dosyaya, hesaba, tam model kimliğine, kimlik doğrulamaya, bölgeye ve sağlayıcı politikasına bağlıdır. Xerify, bir hesapta görünen bir modelin başka bir hesapta da var olacağını taahhüt etmez.

Bu ücretsiz kontrolleri kullanım ortamınızda çalıştırın:

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Sağlayıcı yoklamaları, model kalitesini veya doğruluğunu değil, yerel iletişim hazırlığını saptar. Başarılı bir canlı çağrı, yalnızca o istekte kullanılan tam adaptör/sağlayıcı/model yolunu kanıtlar. Sağlayıcının düz metni bayt düzeyinde belirleyici değildir; bu yüzden Xerify şemayı, sınırları, fail-closed sonuçları ve türü belirlenmiş hataları garanti eder — birebir aynı ifadeleri değil.

## Sonuç sınırı

`confirmed`, verilen kanıt içinde önemli bir karşı örnek bulunamadığı anlamına gelir. Bu; biçimsel bir doğrulama, bir güvenlik sertifikasyonu veya bir değişikliği birleştirmek/yürütmek için otomatik izin değildir. `refuted`, iddiayı engeller; `unclear`, zaman aşımı, kırpılma, geçersiz çıktı ve sağlayıcı hatası ise başarısız sayılır ve yeniden deneme, daha güçlü kanıt veya insan incelemesi gerektirir.

Normal paket ve CI kontrolleri sağlayıcı kimlik bilgisi gerektirmez veya model çağrısı yapmaz. Canlı sağlayıcı testi her zaman açıktır ve abonelik kotası tüketebilir veya API ücretine yol açabilir.

Adaptöre özgü kısıtlamalar için [sağlayıcı adaptörleri](provider-adapters.md) sayfasına bakın. Veri ve prompt sınırları için [SECURITY.md](security.md) sayfasına bakın.
