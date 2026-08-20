[English](../../../examples/README.md) · **Türkçe** · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · [Español](../../es/examples/README.md) · [Français](../../fr/examples/README.md)

# Hesapsız izlenecek yol: her sonuç, sıfır kota

> Belgelerin normatif ve kanonik kaynağı İngilizce dokümantasyondur. Bir çeviri ile test edilmiş sözleşme çelişirse, geçerli olan taraf test edilmiş İngilizce sözleşmedir.

Xerify'in nasıl davrandığını öğrenmek için bir sağlayıcı hesabına, bir API anahtarına ya da bir oturum açmaya ihtiyacınız yok. Bu sayfa, paketle birlikte gelen belirleyici bir sahte sağlayıcı kullanarak **her kararı ve her türü belirlenmiş hatayı** adım adım gösterir.

Burada hiçbir şey bir ağ hizmetine bağlanmaz. Burada hiçbir şey ücretlendirilmez. Aşağıdaki her çıktı, tam olarak bu komutlar çalıştırılarak gözlemlenmiştir.

## Neden sahte bir sağlayıcı

Xerify'in `command` adaptörü, herhangi bir çalıştırılabilir dosyayı çalıştırır, prompt'u stdin üzerinden gönderir ve yanıtı stdout'tan okur. Bu yanıtı bir dil modelinin üretip üretmediğiyle ilgilenmez. Dolayısıyla sabit bir betik de gayet geçerli bir sağlayıcıdır — yanıtlarını sizin kontrol ettiğiniz, bu sayede her sonucu yeniden üretilebilir kılan bir sağlayıcı.

Sahte sağlayıcı `docs/examples/tools/mock-provider.mjs` yolunda bulunur. Tek bir argüman alır — senaryo adı —, prompt'u yok sayar ve sabit bir yanıt yazdırır.

> **Erişilebilirlik:** sahte sağlayıcı, `0.1.0` sonrasındaki sürümden itibaren pakete dahildir. `0.1.0` sürümünde npm paketinde (tarball) yer almaz — bu durumda deponun bir kaynak kopyasını kullanın, ya da dosyayı depodan kendi projenize kopyalayıp `args` değerini kendi kopyanıza yönlendirin. Bu sayfadaki geri kalan her şey değişmeden çalışır.

## Kurulum

Önce kurulu yolu bulun. Sahte sağlayıcıya **mutlak bir yol** ile başvurmalısınız — bir `command` adaptörü yeni bir geçici dizinde çalışır, bu yüzden göreli yollar hiçbir zaman çözümlenmez.

```sh
# Kaynak kod deposundan
MOCK="$PWD/docs/examples/tools/mock-provider.mjs"

# Genel (global) bir npm kurulumundan
MOCK="$(npm root -g)/xverify-cli/docs/examples/tools/mock-provider.mjs"

# Projeye özel bir kurulumdan
MOCK="$PWD/node_modules/xverify-cli/docs/examples/tools/mock-provider.mjs"

echo "$MOCK"
```

Her senaryo için bir adaptör kaydeden, tek kullanımlık bir yapılandırma yazın. Bunu geçici bir dizinde tutmak, gerçek yapılandırmanızın hiç dokunulmadan kalmasını sağlar.

```sh
WORK="$(mktemp -d)"
cat > "$WORK/config.json" <<EOF
{
  "providers": {
    "mockConfirmed": { "kind": "command", "provider": "mock-lab",       "executable": "node",
      "args": ["$MOCK", "confirmed"],  "authKind": "local", "structuredOutput": true },
    "mockRefuted":   { "kind": "command", "provider": "mock-rebuttal",  "executable": "node",
      "args": ["$MOCK", "refuted"],    "authKind": "local", "structuredOutput": true },
    "mockUnclear":   { "kind": "command", "provider": "mock-hedge",     "executable": "node",
      "args": ["$MOCK", "unclear"],    "authKind": "local", "structuredOutput": true },
    "mockProse":     { "kind": "command", "provider": "mock-prose",     "executable": "node",
      "args": ["$MOCK", "prose"],      "authKind": "local", "structuredOutput": true },
    "mockMalformed": { "kind": "command", "provider": "mock-malformed", "executable": "node",
      "args": ["$MOCK", "malformed"],  "authKind": "local", "structuredOutput": true },
    "mockOffSchema": { "kind": "command", "provider": "mock-offschema", "executable": "node",
      "args": ["$MOCK", "off-schema"], "authKind": "local", "structuredOutput": true },
    "mockCrash":     { "kind": "command", "provider": "mock-crash",     "executable": "node",
      "args": ["$MOCK", "crash"],      "authKind": "local", "structuredOutput": true },
    "mockSlow":      { "kind": "command", "provider": "mock-slow",      "executable": "node",
      "args": ["$MOCK", "slow"],       "authKind": "local", "structuredOutput": true },
    "mockFlood":     { "kind": "command", "provider": "mock-flood",     "executable": "node",
      "args": ["$MOCK", "flood"],      "authKind": "local", "structuredOutput": true },
    "notInstalled":  { "kind": "command", "provider": "absent-vendor",
      "executable": "definitely-not-installed-cli", "args": [], "authKind": "subscription" }
  },
  "history": { "enabled": false },
  "logPath": null
}
EOF
chmod 600 "$WORK/config.json"
export XERIFY_USER_CONFIG_PATH="$WORK/config.json"
```

`XERIFY_USER_CONFIG_PATH`, ev dizininize veya projenizin `.xerify/` dizinine hiç dokunmadan Xerify'i bu dosyaya yönlendirir. `history.enabled: false`, bu izlenecek yolun çalıştırma kaydı yazmasını engeller.

İki shell değişkeni komutları kısa tutar:

```sh
EVIDENCE="Evidence E-1: the deployment log shows the migration completed at 04:12 UTC with zero failed rows."
CLAIM="The database migration completed cleanly."
```

Devam etmeden önce bağlantıyı kontrol edin:

```sh
xerify --json providers list
```

Yukarıdaki on sahte adaptörün **yanı sıra** yerleşik `codex` (`openai`) ve `claude` (`anthropic`) adaptörlerini, ve kendi proje yapılandırmanızın tanımladığı her adaptörü göreceksiniz. Yapılandırma, varsayılanların yerine geçmez, onlarla birleştirilir; bu yüzden tam sayı kurulumunuza bağlıdır.

Her sahte sağlayıcının kendi `provider` kimliği bilerek verilmiştir. Aynı sağlayıcıyla yapılan doğrulama reddedildiğinden, tek bir paylaşılan kimlik aşağıdaki her komutu engellerdi. Adaptör başına bu kimlik, ayrıca sahte sağlayıcıların yerleşiklerle çakışmasını da önler — iki adaptör aynı kimliğe yanıt verdiğinde önce kaydedilen kazanır ve yerleşikler önce kaydedilir. Bkz. [başarısızlık modları](failure-modes.md#6b-the-wrong-adapter-answered--exit-5-where-you-expected-exit-3).

## Üç karar türü

### `confirmed` — exit `0`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-lab:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "confirmed",
  "summary": "The supplied evidence supports the claim and no counterexample appears.",
  "findings": [],
  "evidence": [
    {
      "reference": "supplied evidence envelope",
      "observation": "Deterministic mock response; no model judgement was involved."
    }
  ],
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

Exit `0`. `failure: null` değerine dikkat edin — bu operasyonel bir yedek değil, gerçek bir karardır.

### `refuted` — exit `10`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-rebuttal:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "refuted",
  "summary": "The supplied evidence contains a direct counterexample to the claim.",
  "findings": [
    {
      "severity": "high",
      "message": "The evidence states the opposite of the claim.",
      "evidence": "supplied evidence envelope"
    }
  ],
  "failure": null
}
```

Exit `10`. Gerçek bir çalıştırmada asıl içerik `findings` dizisindedir; dört veya beş somut findings içeren kararlar için [çalışan örnekler](README.md) sayfasına bakın.

### `unclear` — exit `11`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-hedge:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "unclear",
  "summary": "The supplied evidence is insufficient to decide the claim either way.",
  "failure": null
}
```

`failure: null` ile birlikte exit `11`. Bu, doğrulayıcının _"kanıt bu konuyu çözmüyor"_ demesidir — bir arıza değil, epistemik bir sonuçtur. Bunu, tümü `null` olmayan bir `failure` taşıyan, aşağıdaki exit `11`'e komşu hatalarla karşılaştırın.

## Türü belirlenmiş hatalar

Aşağıdaki her komut tek satırlıktır. Her sonucun tam açıklaması ve gerçek bir dağıtımda nasıl düzeltileceği [başarısızlık modları](failure-modes.md) sayfasındadır.

```sh
# 1. Çalıştırılabilir dosya tamamen yok -> exit 3, ok:false, PROVIDER_UNAVAILABLE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to absent-vendor:any --claim "$CLAIM"; echo "exit=$?"

# 2. İki tarafta da aynı çağrı sağlayıcısı -> exit 2, hiçbir sağlayıcıya ulaşılmadı
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to openai:gpt-5.6-sol --claim "$CLAIM"; echo "exit=$?"

# 3. Sağlayıcı düz metinle yanıt veriyor -> exit 6, INVALID_PROVIDER_RESPONSE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-prose:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 4. Sağlayıcı kırpılmış JSON döndürüyor -> exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-malformed:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 5. Geçerli JSON, geçersiz karar değeri -> exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-offschema:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 6. Sağlayıcı süreci sıfırdan farklı bir kodla çıkıyor -> exit 5, PROVIDER_FAILURE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-crash:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 7. Sağlayıcı --timeout'tan daha yavaş -> exit 4, TIMEOUT
echo "$EVIDENCE" | xerify --json --timeout 1500 verify \
  --from openai:gpt-5.6-sol --to mock-slow:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 8. Yanıt çıktı sınırını aşıyor -> exit 6, truncation.output true
echo "$EVIDENCE" | XERIFY_MAX_OUTPUT_BYTES=4096 xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-flood:mock-1 --claim "$CLAIM"; echo "exit=$?"
```

Beklenen çıkışlar, sırasıyla: `3`, `2`, `6`, `6`, `6`, `5`, `4`, `6`.

Üzerinde durmaya değer senaryo 3 numaralı olan. Sahte sağlayıcı `Yes, that looks right to me. I would ship it.` yanıtını verir — düz İngilizcede tartışmasız bir onay. Buna rağmen Xerify, exit `6` ile `unclear` döndürür; çünkü düz metindeki bir onay sözleşme kapsamında bir karar sayılmaz. İşte bu ret, ürünün ta kendisi.

## Tüm yüzeyi tek seferde kontrol etmek

Tek bir döngü her çıkış kodunu doğrular. Bu, bir entegrasyon için makul bir duman testidir:

```sh
check() {
  echo "$EVIDENCE" | xerify --json ${3:-} verify \
    --from openai:gpt-5.6-sol --to "$1:mock-1" --claim "$CLAIM" >/dev/null 2>&1
  actual=$?
  [ "$actual" = "$2" ] && echo "ok   $1 -> $actual" || echo "FAIL $1 -> $actual (want $2)"
}

check mock-lab       0
check mock-rebuttal  10
check mock-hedge     11
check mock-prose     6
check mock-malformed 6
check mock-offschema 6
check mock-crash     5
check mock-slow      4 "--timeout 1500"
check absent-vendor  3
```

## Temizlik

```sh
unset XERIFY_USER_CONFIG_PATH
rm -rf "$WORK"
```

Projenize hiçbir şey yazılmadı. `"history": { "enabled": false }` satırını kaldırarak geçmişi etkinleştirdiyseniz, `.xerify/runs/` dizinini de kaldırın.

## Şimdi nereye bakmalı

- [Başarısızlık modları](failure-modes.md) — her hatanın neden olduğu ve üretimde nasıl düzeltileceği
- [Çalışan doğrulama örnekleri](README.md) — aynı şekiller gerçek sağlayıcılara karşı, gerçek anlaşmazlıklarla
- [Proje yapılandırması](../configuration.md) — öncelik sırası, izinler ve tam yapılandırma şeması
- [CLI referansı](../cli-reference.md) — her komut ve bayrak
