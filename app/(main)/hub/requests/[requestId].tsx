import ContactRequestDetailTool from '../../../../src/components/tools/ContactRequestDetailTool';

export default function HubContactRequestDetail() {
  return (
    <ContactRequestDetailTool
      threadBasePath='/(main)/hub/messages'
      communityBasePath='/(main)/hub/community'
    />
  );
}
