import "server-only";

export type EnquiryConfig = { target: "development" | "test"; host: "127.0.0.1"; port: 54322 | 55422; database: "postgres"; user: "stratadrive_enquiry_app"; password: string };

export function getEnquiryConfig(env: NodeJS.ProcessEnv = process.env): EnquiryConfig | null {
  const target = env.STRATA_ENQUIRY_TARGET;
  const password = env.STRATA_ENQUIRY_PASSWORD;
  if ((target !== "development" && target !== "test") || !password || !/^[a-f0-9]{48,128}$/i.test(password)) return null;
  return { target, password, host: "127.0.0.1", port: target === "development" ? 54322 : 55422, database: "postgres", user: "stratadrive_enquiry_app" };
}
