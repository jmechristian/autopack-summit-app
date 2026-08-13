import ContactsTool from '../../../src/components/tools/ContactsTool';

export default function HubContactsScreen() {
  return (
    <ContactsTool
      profileBasePath="/(main)/hub/community"
      threadBasePath="/(main)/hub/messages"
    />
  );
}
