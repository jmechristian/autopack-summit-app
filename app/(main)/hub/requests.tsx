import RequestsTool from '../../../src/components/tools/RequestsTool';

export default function HubRequests() {
  return (
    <RequestsTool
      threadBasePath='/(main)/hub/messages'
      communityBasePath='/(main)/hub/community'
    />
  );
}
