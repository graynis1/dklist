import { registerUser } from "@/db/queries/auth-account";
import { signMobileToken } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Real gap: mobile had no registration screen at all, only a login form -
 * a brand-new user could not create an account from the app. Mirrors web's
 * registerAction: registerUser() + an immediate sign-in, except this
 * returns a Bearer token instead of setting a cookie. Login itself doesn't
 * gate on mailAuth (see registerUser's own doc comment), so the account is
 * fully usable right away regardless of `verificationRequired` - that flag
 * is only surfaced to the client as a soft "check your email" hint.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const surname = typeof body.surname === "string" ? body.surname : "";
  const username = typeof body.username === "string" ? body.username : "";
  const mail = typeof body.mail === "string" ? body.mail : "";
  const birthDate = typeof body.birthDate === "string" ? body.birthDate : "";
  const sex = typeof body.sex === "string" ? body.sex : "";
  const password = typeof body.password === "string" ? body.password : "";

  try {
    const result = await registerUser({ name, surname, username, mail, birthDate, sex, password });
    const token = await signMobileToken({ userId: result.userId, username, userType: "Üye" });

    return mobileJson({
      status: "ok",
      token,
      user: { id: result.userId, username, image: null, userType: "Üye" },
      verificationRequired: result.verificationRequired,
      mailSent: result.mailSent,
      devVerificationCode: result.mailSent ? undefined : result.verificationCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kayıt oluşturulamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
