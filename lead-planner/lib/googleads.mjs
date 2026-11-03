// Клиент Google Ads API (REST): OAuth-рефреш, заголовки developer-token и login-customer-id (MCC), googleAds:search.
// Доступы — из переменных окружения GOOGLE_ADS_* или из файла GOOGLE_ADS_ENV (строки KEY=VALUE, вне репозитория).
import fs from "node:fs";

// Версия API: Google выключает старые версии примерно через год — при ответе «version deprecated/unsupported»
// клиент сам переходит на следующую (до +3) и запоминает её до конца запуска.
let version = Number(String(process.env.GOOGLE_ADS_API_VERSION || "v26").replace(/\D/g, ""));

export function loadCreds(file = process.env.GOOGLE_ADS_ENV) {
  const env = { ...process.env };
  if (file && fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*(GOOGLE_ADS_[A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) env[m[1]] = m[2];
    }
  }
  const need = ["CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN", "DEVELOPER_TOKEN", "MCC_CUSTOMER_ID"];
  const miss = need.filter((k) => !env[`GOOGLE_ADS_${k}`]);
  if (miss.length) throw new Error(`Нет доступов Google Ads: ${miss.map((k) => "GOOGLE_ADS_" + k).join(", ")}`);
  return Object.fromEntries(need.map((k) => [k, env[`GOOGLE_ADS_${k}`]]));
}

export async function connect(creds) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: creds.CLIENT_ID, client_secret: creds.CLIENT_SECRET, refresh_token: creds.REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`OAuth Google: ${j.error || r.status} ${j.error_description || ""}`.trim());
  const mcc = String(creds.MCC_CUSTOMER_ID).replace(/\D/g, "");
  const headers = { authorization: `Bearer ${j.access_token}`, "developer-token": creds.DEVELOPER_TOKEN, "login-customer-id": mcc, "content-type": "application/json" };
  async function search(customerId, query) {
    const rows = [];
    let pageToken;
    do {
      let res, body;
      for (let bump = 0; ; bump++) {
        res = await fetch(`https://googleads.googleapis.com/v${version}/customers/${String(customerId).replace(/\D/g, "")}/googleAds:search`, {
          method: "POST",
          headers,
          body: JSON.stringify(pageToken ? { query, pageToken } : { query }),
        });
        body = await res.json().catch(() => ({}));
        const detail = JSON.stringify(body.error || "");
        if (!res.ok && bump < 3 && (res.status === 404 || /UNSUPPORTED_VERSION|deprecated/i.test(detail))) {
          version++;
          continue;
        }
        break;
      }
      if (!res.ok) {
        const e = body.error?.details?.[0]?.errors?.[0];
        throw new Error(`Google Ads ${customerId}: ${e?.message || body.error?.message || res.status}`);
      }
      rows.push(...(body.results || []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return rows;
  }
  return { mcc, search, version: () => `v${version}` };
}
