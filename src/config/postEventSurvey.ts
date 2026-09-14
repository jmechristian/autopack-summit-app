import { APS_ID } from './apsConfig';

export const POST_EVENT_SURVEY_ROUTE = '/(main)/hub/post-event-survey';
export const POST_EVENT_SURVEY_SUCCESS_ROUTE = '/(main)/hub/post-event-survey/success';
export const POST_EVENT_SURVEY_DEEP_LINK = 'autopacksummitapp://hub/post-event-survey';

export type PostEventSurveyIdentity =
  | 'SPONSOR'
  | 'SOLUTION_PROVIDER'
  | 'OEM'
  | 'TIER_ONE';

export const POST_EVENT_SURVEY_IDENTITIES: {
  value: PostEventSurveyIdentity;
  label: string;
}[] = [
  { value: 'SPONSOR', label: 'Sponsor' },
  { value: 'SOLUTION_PROVIDER', label: 'Packaging / Solution Provider' },
  { value: 'OEM', label: 'OEM' },
  { value: 'TIER_ONE', label: 'Tier One Part Supplier' },
];

export const POST_EVENT_SURVEY_SESSIONS = [
  { id: 'robotics-gm', title: 'Robotics Integration at GM, Nasser Nasser, GM' },
  { id: 'oem-volvo', title: 'OEM Packaging Needs, Carlos Gutierrez, Volvo' },
  { id: 'oem-nissan', title: 'OEM Packaging Needs, Alex Seger, Nissan' },
  {
    id: 'pakfab-toyota',
    title: 'PakFab Case Study: Daniel Castaneda, PakFab & Trevor Franken, Toyota',
  },
  { id: 'vehicle-forecasting', title: 'Vehicle Forecasting, Joseph McCabe, AFS' },
  { id: 'isuzu-next-chapter', title: "Isuzu's Next Chapter, Russell Ferebee, Isuzu" },
  { id: 'guardian-workshop', title: 'Guardian Breakout Workshop, Ben Hesskamp, Guardian' },
  {
    id: 'epr-nissan',
    title: 'Extended Producer Responsibility (EPR), Nathan Kilcoyne, Nissan',
  },
  {
    id: 'ask-a-buyer',
    title: 'Ask a Buyer, Michael Isecke GM & Matthias Stiller, Jonas & Redmann',
  },
  {
    id: 'forming-the-future',
    title: 'Forming the Future of Automotive Packaging, Nate Franck, TriEnda',
  },
  {
    id: 'oem-panel',
    title:
      'OEM Panel, Bridget Grewal, Magna & Nasser Nasser, GM & Todd Chesna, Ford & Kelsey Kester, BMW',
  },
] as const;

export type PostEventSurveySessionId = (typeof POST_EVENT_SURVEY_SESSIONS)[number]['id'];

export type PostEventSurveySessionRating = {
  id: PostEventSurveySessionId | string;
  rating: number;
};

export function postEventSurveyKey(registrantId: string, eventId = APS_ID) {
  return `pes:${eventId}|r:${registrantId}`;
}

export function identityFromAttendeeType(
  attendeeType?: string | null,
): PostEventSurveyIdentity | null {
  switch (String(attendeeType || '').trim()) {
    case 'SPONSOR':
      return 'SPONSOR';
    case 'SOLUTIONPROVIDER':
      return 'SOLUTION_PROVIDER';
    case 'OEM':
      return 'OEM';
    case 'TIER1':
      return 'TIER_ONE';
    default:
      return null;
  }
}
