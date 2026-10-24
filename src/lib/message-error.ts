export async function messageFailure(response: Response) {
  if (response.status === 429) return "Too many messages. Wait a moment and try again.";
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (data?.error === "name") return "Enter your name.";
  if (data?.error === "email") return "Enter an email.";
  if (data?.error === "company") return "Enter the company name.";
  if (data?.error === "topic") return "Choose a topic.";
  if (data?.error === "message") return "Add a short message.";
  return "The message did not send. Try again.";
}
