const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://music.overflowmvmt.com/api";
const adminApiKey = process.env.ADMIN_API_KEY || "";

function getAdminAuthHeader() {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is not configured in web environment");
  }

  return `Bearer ${adminApiKey}`;
}

type ServerApiAuthMode = "admin" | "user" | "none";

type ServerApiFetchOptions = RequestInit & {
  authMode?: ServerApiAuthMode;
  userToken?: string;
};

export async function serverApiFetch(path: string, init?: ServerApiFetchOptions): Promise<Response> {
  const target = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const headers = new Headers(init?.headers || {});
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!isFormData && !headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const authMode = init?.authMode || "admin";
  if (authMode === "admin") {
    headers.set("Authorization", getAdminAuthHeader());
  }
  if (authMode === "user") {
    const userToken = (init?.userToken || "").trim();
    if (!userToken) {
      throw new Error("userToken is required for authMode=user");
    }
    headers.set("Authorization", `Bearer ${userToken}`);
  }

  return fetch(target, {
    ...init,
    headers,
    cache: "no-store",
  });
}
