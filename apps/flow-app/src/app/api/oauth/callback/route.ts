import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptCredentials } from "@/lib/hr-integration/credentials";

/**
 * OAuth2コールバック。
 * 認可コードをアクセストークンに交換し、暗号化して保存する。
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings/connections?error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/connections?error=invalid_callback", request.url)
    );
  }

  // stateをデコード
  let stateData: { connectionId: string; codeVerifier: string };
  try {
    stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings/connections?error=invalid_state", request.url)
    );
  }

  const { connectionId, codeVerifier } = stateData;

  // 接続情報を取得してstateを検証
  const { data: connection } = await supabase
    .from("hr_connections")
    .select("id, adapter_type, oauth_state")
    .eq("id", connectionId)
    .single();

  if (!connection) {
    return NextResponse.redirect(
      new URL("/settings/connections?error=connection_not_found", request.url)
    );
  }

  const oauthState = connection.oauth_state as Record<string, unknown> | null;
  if (!oauthState || oauthState.state !== state) {
    return NextResponse.redirect(
      new URL("/settings/connections?error=state_mismatch", request.url)
    );
  }

  const redirectUri = oauthState.redirect_uri as string;

  // freee: コードをトークンに交換
  if (connection.adapter_type === "freee") {
    const clientId = process.env.FREEE_CLIENT_ID;
    const clientSecret = process.env.FREEE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL(
          "/settings/connections?error=freee_not_configured",
          request.url
        )
      );
    }

    try {
      const tokenResponse = await fetch(
        "https://accounts.secure.freee.co.jp/public_api/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        return NextResponse.redirect(
          new URL(
            "/settings/connections?error=token_exchange_failed",
            request.url
          )
        );
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
      };

      // refresh_tokenを暗号化して保存
      const encryptedRefreshToken = encryptCredentials(tokens.refresh_token);
      const expiresAt = new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString();

      await supabase
        .from("hr_connections")
        .update({
          oauth_state: {
            access_token: tokens.access_token,
            refresh_token_encrypted: encryptedRefreshToken.toString("base64"),
            expires_at: expiresAt,
            token_type: tokens.token_type,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      return NextResponse.redirect(
        new URL(
          `/settings/connections/${connectionId}/edit?oauth=success`,
          request.url
        )
      );
    } catch (err) {
      console.error("OAuth callback error:", err);
      return NextResponse.redirect(
        new URL("/settings/connections?error=callback_error", request.url)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/settings/connections?error=unsupported_adapter", request.url)
  );
}
