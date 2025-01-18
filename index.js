import { createHash } from "crypto";

async function sleep(ms) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTokens() {
  const tokens = JSON.parse(process.env.TOKENS);
  delete tokens.github_token;
  return tokens;
}

async function request(url, options) {
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`请求失败：${url}`);
  }

  return await res.json();
}

async function fetchTbs(token) {
  const { tbs, is_login } = await request(
    "http://tieba.baidu.com/dc/common/tbs",
    { headers: { Cookie: "BDUSS=" + token } }
  );

  if (is_login !== 1) {
    throw new Error("BDUSS 无效");
  }

  return tbs;
}

async function fetchForums(token) {
  const { no, error, data } = await request(
    "https://tieba.baidu.com/mo/q/newmoindex",
    { headers: { Cookie: "BDUSS=" + token } }
  );

  if (no !== 0) {
    throw new Error(error);
  }

  return data.like_forum;
}

function md5(text) {
  return createHash("md5").update(text).digest("hex");
}

async function signForum(forumName, tbs, token) {
  const { error_code, error_msg } = await request(
    "http://c.tieba.baidu.com/c/c/forum/sign",
    {
      method: "POST",
      body: new URLSearchParams({
        kw: forumName,
        tbs,
        sign: md5(`kw=${forumName}tbs=${tbs}tiebaclient!!!`),
      }),
      headers: { Cookie: "BDUSS=" + token },
    }
  );

  if (error_code !== "0") {
    throw new Error(error_msg);
  }
}

async function signOne(token) {
  const tbs = await fetchTbs(token);
  const forums = await fetchForums(token);

  for (const forum of forums) {
    if (forum.is_sign === 1) {
      console.warn(`  已签：${forum.forum_name}`);
      continue;
    }

    try {
      await signForum(forum.forum_name, tbs, token);
      console.log(`  成功：${forum.forum_name}`);
      await sleep(500);
    } catch (error) {
      console.error(`  失败：${forum.forum_name}：${error.message}`);
    }
  }
}

async function signAll() {
  const tokens = parseTokens();

  for (const [name, token] of Object.entries(tokens)) {
    console.log(`签到开始：${name}`);
    try {
      await signOne(token);
      console.log(`签到结束：${name}`);
    } catch (error) {
      console.error(`签到中止：${name}：${error.message}`);
    }
  }
}

await signAll();
