import { createHmac } from "crypto";

const API_KEY = "C69BAF41DA5ABD1FFEDC6D2FEA56B";

function parseCredentials() {
  return Object.entries(JSON.parse(process.env.SECRETS))
    .filter(([key]) => key.startsWith("PICACG_"))
    .map(([key, value]) => ({
      name: key.slice(7),
      username: value.split("\n")[0],
      password: value.split("\n")[1],
    }));
}

function hmacSha256(text) {
  return createHmac(
    "sha256",
    "~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn"
  )
    .update(text)
    .digest("hex");
}

async function request(url, options) {
  const time = (new Date().getTime() / 1000).toString();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const path = new URL(url).pathname.slice(1);
  const signature = hmacSha256(
    path + time + nonce + "post" + API_KEY.toLowerCase()
  );

  const res = await fetch(url, {
    method: "POST",
    ...options,
    headers: {
      "api-key": API_KEY,
      accept: "application/vnd.picacomic.com.v1+json",
      "app-uuid": "defaultUuid",
      "app-build-version": "44",
      "User-Agent": "okhttp/3.8.1",
      "Content-Type": "application/json; charset=UTF-8",
      time,
      nonce,
      signature,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`请求失败：${url}`);
  }

  const { code, message, data } = await res.json();

  if (code !== 200) {
    throw new Error(message);
  }

  return data;
}

async function logIn(username, password) {
  const { token } = await request(
    "https://picaapi.picacomic.com/auth/sign-in",
    { body: JSON.stringify({ email: username, password }) }
  );

  return token;
}

async function signIn(token) {
  const { res } = await request(
    "https://picaapi.picacomic.com/users/punch-in",
    { headers: { Authorization: token } }
  );

  if (res.status !== "ok") {
    throw new Error("可能已经签到");
  }
}

async function signOne(username, password) {
  const token = await logIn(username, password);
  await signIn(token);
}

async function signAll() {
  for (const { name, username, password } of parseCredentials()) {
    console.log(`签到开始：${name}`);
    try {
      await signOne(username, password);
      console.log(`签到结束：${name}`);
    } catch (error) {
      console.error(`签到中止：${name}：${error.message}`);
    }
  }
}

await signAll();
