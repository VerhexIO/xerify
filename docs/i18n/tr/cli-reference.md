[English](../../README.md) · **Türkçe** · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · [Français](../fr/README.md)

# CLI referansı

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Tüm komutlar, kitaplık ve MCP sunucusuyla aynı doğrulanmış yapılandırmayı ve çekirdeği kullanır. Genel seçenekler bir alt komuttan önce veya sonra yer alabilir:

| Seçenek                    | Anlamı                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| `--json`                   | stdout'a tek ve kararlı bir JSON zarfı yazar                          |
| `--timeout <milliseconds>` | Sınırlı sağlayıcı yaşam döngüsü zaman aşımını geçersiz kılar          |
| `--log <path>`             | Gizli bilgi içermeyen JSONL denetim meta verisi yolunu geçersiz kılar |
| `--version`                | Kurulu Xerify sürümünü yazdırır                                       |

## Doğrulama ve adaptör komutları

| Komut                                                                        | Amaç                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `xerify ask [question]`                                                      | Açık uçlu ikinci görüş; stdin sınırlı bağlam olarak kullanılır            |
| `xerify ask --question <text> --to <provider:model>`                         | stdin bağlam sağladığında kullanılacak, belirsizliğe yer bırakmayan biçim |
| `xerify verify --from <provider:model> --to <provider:model> --claim <text>` | Farklı çağrı sağlayıcılarıyla çürütme odaklı doğrulama                    |
| `xerify request --to <provider:model> --input <file>`                        | Ham, sınırlı adaptör hata ayıklama isteği; doğrulama garantisi sağlamaz   |

`ask` ve `verify`, ayrıca `--adapter <id>` ve `--context-label <label>` parametrelerini kabul eder. `ask` için `--from` isteğe bağlıdır; `verify` ise bilinen veya beyan edilmiş bir kaynak kökeni gerektirir. Her canlı hedef tam bir model kimliği içermelidir. Aynı sağlayıcıyla yapılan doğrulama ile Cursor `auto` seçimi, sağlayıcıya hiç çağrı yapılmadan başarısız olur.

## Kurulum, yapılandırma ve sağlık kontrolü

| Komut                                      | Amaç                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `xerify init`                              | Projeye özel `.xerify/` durumunu idempotent biçimde başlatır                        |
| `xerify health [--network]`                | Proje ve adaptör hazırlığını toplu olarak özetler                                   |
| `xerify doctor [--network]`                | Ayrıntılı çalışma zamanı, yapılandırma, MCP ve adaptör tanılaması                   |
| `xerify providers list`                    | Çıkarım çağrısı yapmadan yapılandırılmış yetenekleri listeler                       |
| `xerify providers probe --provider <id>`   | Tek bir adaptörün çalıştırılabilir dosya/kimlik doğrulama hazırlığını yoklar        |
| `xerify providers probe --all [--network]` | Her adaptörü yoklar; ağ kontrolleri çıkarım içermez                                 |
| `xerify config show`                       | Çözümlenmiş yapılandırmayı ve kaynaklarını, gizli bilgiler gizlenmiş halde gösterir |
| `xerify config validate`                   | Proje/kullanıcı yapılandırmasını doğrular ve gizlenmiş çözümlemeyi yazdırır         |

`health`, `doctor`, yapılandırma komutları, run komutları, yetenek keşfi ve varsayılan sağlayıcı yoklaması hiçbir modele çağrı yapmaz. `--network` yalnızca sınırlı bir uç nokta erişilebilirlik kontrolü ekler.

## Çalıştırma geçmişi

| Komut                                             | Amaç                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `xerify runs list [--archived] [--limit <count>]` | Etkin kayıtları veya indekslenmiş arşiv özetlerini listeler         |
| `xerify runs search <query> [--limit <count>]`    | Arşivlenmiş head/sağlayıcı/model/karar meta verilerinde arama yapar |
| `xerify runs show <run> [--archived]`             | Normalleştirilmiş tek bir kaydı gösterir                            |
| `xerify runs show <run> --include-evidence`       | Yakalanan kanıt içeriğini açıkça dahil eder                         |
| `xerify runs archive <run>`                       | Etkin bir kaydı arşive taşır                                        |
| `xerify runs restore <run>`                       | Arşivlenmiş bir kaydı geri yükler                                   |
| `xerify runs delete <run> --yes [--archived]`     | Tek bir kaydı kalıcı olarak siler                                   |

`<run>`, ondalık sıra numarasını (`1`) veya kalıcı kimliği (`xrun_000001`) kabul eder. Arşivleme, geri yükleme ve silme işlemleri yerel dosya sistemi üzerinde gerçekleşir ve asla bir sağlayıcıya çağrı yapmaz. Devam eden bir kayıt arşivlenemez veya silinemez.

Arşiv listelemesi, sıkıştırılmış bir katalog olarak `.xerify/archive/index.jsonl` dosyasını kullanır. Her süreç özeti, yakalama politikasına uygun güvenli bir `head` içerir; böylece insanlar ve ajanlar tam kaydı açmadan önce olası eşleşmeleri belirleyebilir. `runs search`, arşivlenmiş her çalıştırmayı tek tek açmadan bu aramayı gerçekleştirir.

## MCP sunucusu

| Komut                                                                        | Amaç                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| `xerify mcp stdio`                                                           | Yerel MCP'yi STDIO üzerinden sunar           |
| `xerify mcp http --host 127.0.0.1 --port 8787`                               | Loopback üzerinden Streamable HTTP MCP sunar |
| `xerify mcp http --host 0.0.0.0 --port 8787 --token-env NAME --allow-public` | Açıkça kimlik doğrulamalı genel bağlama      |

STDIO, stdout'u protokol çerçeveleri için ayırır. Loopback dışı HTTP, hem `--allow-public` hem de adlandırılmış bir ortam değişkeni üzerinden sağlanan bir bearer token gerektirir.
