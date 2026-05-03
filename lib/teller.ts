import https from "https";
import fs from "fs";

interface TellerRequestOptions {
  method?: string;
  body?: string;
}

function loadPem(pathEnv: string | undefined, inlineEnv: string | undefined): string | undefined {
  if (pathEnv) return fs.readFileSync(pathEnv, "utf-8");
  return inlineEnv;
}

export function tellerRequest<T = unknown>(path: string, accessToken: string, options: TellerRequestOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const cert = loadPem(process.env.TELLER_CERT_PATH, process.env.TELLER_CERT);
    const key = loadPem(process.env.TELLER_KEY_PATH, process.env.TELLER_KEY);

    if (!cert || !key) {
      reject(new Error("TELLER_CERT and TELLER_KEY (or _PATH variants) required"));
      return;
    }

    const auth = Buffer.from(accessToken + ":").toString("base64");

    const req = https.request(
      {
        hostname: "api.teller.io",
        path,
        method: options.method ?? "GET",
        cert,
        key,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error(`Teller non-JSON response: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
