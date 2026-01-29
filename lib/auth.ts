import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import type { FeishuUser } from "./feishu/types";

const secret = new TextEncoder().encode(env.JWT_SECRET);

/**
 * 签发 JWT
 */
export async function signJWT(payload: FeishuUser) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h") // 设置 2 小时有效期
    .sign(secret);
}

/**
 * 验证 JWT
 */
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as FeishuUser;
  } catch (e) {
    return null;
  }
}
