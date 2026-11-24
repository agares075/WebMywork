import { requirePageSession } from "@/lib/auth/session";
import { contactHistory } from "@/lib/contacts/service";
import { connectionFailure } from "@/lib/sheets/errors";
import { ContactsScreen } from "@/components/contacts/contacts-screen";
import type { ContactHistory } from "@/types/contact";

export const dynamic = "force-dynamic";
export default async function ContactsPage() {
  await requirePageSession();
  let contacts: ContactHistory[] = [];
  let error = "";
  try { contacts = await contactHistory(); }
  catch (reason) { error = connectionFailure(reason).message; }
  return <ContactsScreen initialContacts={contacts} initialError={error} />;
}
