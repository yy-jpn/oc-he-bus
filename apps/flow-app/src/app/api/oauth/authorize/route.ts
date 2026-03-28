import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "node:crypto";

/**
 * OAuth2認可フロー開始。
 * connectionId + adapterType をクエリパラメータで受け取り、
 * 適切なOAuth2プロバイダの認可URLにリダイレクトする。
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connection_id");
  const adapterType = url.searchParams.get("adapter_type");

  if (!connectionId || !adapterType) {
    return NextResponse.json(
      { error: "connection_id and adapter_type are required" },
      { status: 400 }
    );
  }

  // PKCE: code_verifier → code_challenge
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // stateにconnectionIdとcode_verifierを含める
  const state = Buffer.from(
    JSON.stringify({ connectionId, codeVerifier })
  ).toString("base64url");

  if (adapterType === "freee") {
    const clientId = process.env.FREEE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "FREEE_CLIENT_ID is not configured" },
        { status: 500 }
      );
    }

    const redirectUri = new URL("/api/oauth/callback", request.url).toString();

    // oauth_stateにstate情報を保存
    await supabase
      .from("hr_connections")
      .update({
        oauth_state: {
          state,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          initiated_at: new Date().toISOString(),
        },
      })
      .eq("id", connectionId);

    const authUrl = new URL("https://accounts.secure.freee.co.jp/public_api/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  }

  return NextResponse.json(
    { error: `OAuth not supported for adapter: ${adapterType}` },
    { status: 400 }
  );
}
