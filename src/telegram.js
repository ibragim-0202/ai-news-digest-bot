/**
 * Send a batch of pre-composed HTML messages to Telegram, in order, with a
 * small delay between them to stay clear of rate limits. Throws on the first
 * failed send so the orchestrator does NOT persist those items as "sent" —
 * a delivery failure must never be swallowed silently.
 */
export async function sendMessages(messages, config, logger = console) {
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  for (let i = 0; i < messages.length; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: messages[i],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
    }
    logger.info?.(`telegram: sent message ${i + 1}/${messages.length}`);
    if (i < messages.length - 1) await sleep(400); // gentle backoff between parts
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
