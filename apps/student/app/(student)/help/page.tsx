import HelpClient from "./HelpClient";

export const revalidate = 3600; // 1 hour - static help content

export default function HelpPage() {
  return <HelpClient />;
}
