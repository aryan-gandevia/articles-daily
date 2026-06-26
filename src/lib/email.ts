import { Resend } from "resend";
import { Article } from "./types";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendFeedbackEmail({
  feedbackText,
  username,
  userEmail,
  screenshots,
  toEmail,
}: {
  feedbackText: string;
  username?: string;
  userEmail?: string;
  screenshots: { filename: string; content: string; contentType: string }[];
  toEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const attachments = screenshots.map((s) => ({
    filename: s.filename,
    content: s.content,
    content_type: s.contentType,
  }));

  const metadataLines = [
    username ? `Username: ${username}` : null,
    userEmail ? `User Email: ${userEmail}` : null,
    `Submitted At: ${new Date().toISOString()}`,
  ].filter(Boolean);

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; padding: 24px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Articles Daily Feedback</h1>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
        ${metadataLines.join("<br />")}
      </p>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-line; font-size: 15px; line-height: 1.5;">
        ${feedbackText.replace(/\n/g, "<br />")}
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        ${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"} attached.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: "New Articles Daily Feedback",
      html,
      attachments,
    });
    return { success: true };
  } catch (err) {
    console.error("[Email] Failed to send feedback:", err);
    return { success: false, error: "Failed to send feedback email" };
  }
}

export async function sendDigestEmails(
  subscribers: { email: string; username: string }[],
  articles: Article[],
  appUrl: string
): Promise<{ sent: number; failed: number }> {
  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set, skipping email dispatch");
    return { sent: 0, failed: 0 };
  }

  if (subscribers.length === 0 || articles.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const topArticles = articles.slice(0, 5);
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const subject = `Your Articles Daily digest — ${articles.length} new engineering articles`;

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      const html = buildDigestEmail({
        username: subscriber.username,
        date,
        articles: topArticles,
        totalArticles: articles.length,
        appUrl,
      });

      await resend.emails.send({
        from: fromEmail,
        to: subscriber.email,
        subject,
        html,
      });

      sent++;
    } catch (err) {
      console.error(`[Email] Failed to send to ${subscriber.email}:`, err);
      failed++;
    }
  }

  console.log(`[Email] Digest sent: ${sent} succeeded, ${failed} failed`);
  return { sent, failed };
}

function buildDigestEmail({
  username,
  date,
  articles,
  totalArticles,
  appUrl,
}: {
  username: string;
  date: string;
  articles: Article[];
  totalArticles: number;
  appUrl: string;
}) {
  const articleList = articles
    .map(
      (article, index) => `
      <li style="margin-bottom: 16px;">
        <strong>${index + 1}. ${article.title}</strong>
        <div style="margin-top: 4px; color: #6b7280; font-size: 14px;">
          ${article.source} · ${article.estimatedReadTime ? `${article.estimatedReadTime} min read` : "Quick read"}
        </div>
        <div style="margin-top: 4px;">
          <a href="${article.url}" style="color: #3b82f6; text-decoration: none;">Read article →</a>
        </div>
      </li>
    `
    )
    .join("");

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; padding: 24px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Articles Daily</h1>
      <p style="color: #6b7280; margin-bottom: 24px;">${date}</p>

      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        Hi ${username}, ${totalArticles} new software engineering articles were curated today.
      </p>

      <h2 style="font-size: 18px; margin-bottom: 12px;">Top picks</h2>
      <ol style="padding-left: 20px; margin-bottom: 24px;">
        ${articleList}
      </ol>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
          View full digest
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        You received this because you subscribed to the Articles Daily digest.
      </p>
    </div>
  `;
}
