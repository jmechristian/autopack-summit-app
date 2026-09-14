export const LEADERBOARD_VISIBLE_LIMIT = 50;

export function isStaffAttendeeType(type?: string | null) {
  return String(type || '').toUpperCase() === 'STAFF';
}

export const CONNECTION_MILESTONES = [
  { id: 'connection_5', threshold: 5, points: 50, label: 'Connect with 5 people' },
  { id: 'connection_10', threshold: 10, points: 50, label: 'Connect with 10 people' },
  { id: 'connection_25', threshold: 25, points: 80, label: 'Connect with 25 people' },
  { id: 'connection_50', threshold: 50, points: 80, label: 'Connect with 50 people' },
  { id: 'connection_100', threshold: 100, points: 60, label: 'Connect with 100 people' },
] as const;

export const PASSPORT_POINTS_PER_STAMP = 4;
export const FEEDBACK_POINTS = [25, 15, 15] as const;

export type AwardCategoryId = 'profile' | 'networking' | 'passport' | 'explore' | 'feedback';

export const AWARD_CATEGORIES: { id: AwardCategoryId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'networking', label: 'Networking' },
  { id: 'passport', label: 'Passport Challenge' },
  { id: 'explore', label: 'Explore' },
  { id: 'feedback', label: 'App feedback' },
];

export type AwardKind = 'once' | 'milestone' | 'perUnit';

export type AwardDefinition = {
  id: string;
  category: AwardCategoryId;
  label: string;
  href: string;
  kind: AwardKind;
  points: number;
  threshold?: number;
};

export type LeaderboardFacts = {
  hasPhoto: boolean;
  hasBio: boolean;
  hasLinkedIn: boolean;
  hasPhone: boolean;
  hasJobTitle: boolean;
  hasExpertise: boolean;
  expertiseCount: number;
  hasAffiliation: boolean;
  hasEducation: boolean;
  hasInterest: boolean;
  hasResume: boolean;
  acceptedConnections: number;
  sentRequests: number;
  stamps: number;
  stampTotal: number;
  favoriteSessions: number;
  favoriteExhibitors: number;
  favoriteSpeakers: number;
  favoriteSponsors: number;
  sessionNotes: number;
  contactNotes: number;
  exhibitorViews: number;
  announcementOpens: number;
  sentDms: number;
  feedbackCount: number;
};

export type AwardProgress = {
  current: number;
  target: number;
};

export type EvaluatedAward = AwardDefinition & {
  earned: boolean;
  pointsEarned: number;
  progress: AwardProgress;
  detail?: string;
};

export type EvaluatedScore = {
  total: number;
  awards: EvaluatedAward[];
  categoryTotals: Record<AwardCategoryId, number>;
  nextHint: string;
  counts: {
    connections: number;
    sentRequests: number;
    stamps: number;
    stampTotal: number;
    feedback: number;
  };
};

const PROFILE_EDIT = '/(main)/profile/edit';
const COMMUNITY = '/(main)/community';
const PASSPORT = '/(main)/hub/passport';
const AGENDA = '/(main)/agenda';
const EXHIBITORS = '/(main)/engage/exhibitors';
const SPEAKERS = '/(main)/engage/speakers';
const SPONSORS = '/(main)/engage/sponsors';
const ANNOUNCEMENTS = '/(main)/engage/announcements';
const MESSAGES = '/(main)/engage/messages';
const FEEDBACK = '/(main)/hub/feedback';

function once(
  id: string,
  category: AwardCategoryId,
  label: string,
  points: number,
  href: string,
): AwardDefinition {
  return { id, category, label, points, href, kind: 'once' };
}

export function emptyLeaderboardFacts(): LeaderboardFacts {
  return {
    hasPhoto: false,
    hasBio: false,
    hasLinkedIn: false,
    hasPhone: false,
    hasJobTitle: false,
    hasExpertise: false,
    expertiseCount: 0,
    hasAffiliation: false,
    hasEducation: false,
    hasInterest: false,
    hasResume: false,
    acceptedConnections: 0,
    sentRequests: 0,
    stamps: 0,
    stampTotal: 0,
    favoriteSessions: 0,
    favoriteExhibitors: 0,
    favoriteSpeakers: 0,
    favoriteSponsors: 0,
    sessionNotes: 0,
    contactNotes: 0,
    exhibitorViews: 0,
    announcementOpens: 0,
    sentDms: 0,
    feedbackCount: 0,
  };
}

function pushOnce(
  awards: EvaluatedAward[],
  def: AwardDefinition,
  earned: boolean,
) {
  awards.push({
    ...def,
    earned,
    pointsEarned: earned ? def.points : 0,
    progress: { current: earned ? 1 : 0, target: 1 },
  });
}

function nextHintFor(facts: LeaderboardFacts, awards: EvaluatedAward[]): string {
  const nextConnection = CONNECTION_MILESTONES.find((m) => facts.acceptedConnections < m.threshold);
  if (nextConnection) {
    const remaining = nextConnection.threshold - facts.acceptedConnections;
    return `${remaining} more connection${remaining === 1 ? '' : 's'} to ${nextConnection.threshold}`;
  }
  if (facts.stampTotal > 0 && facts.stamps < facts.stampTotal) {
    const remaining = facts.stampTotal - facts.stamps;
    return `${remaining} more passport stamp${remaining === 1 ? '' : 's'} to finish`;
  }
  const locked = awards.find((award) => !award.earned && award.kind !== 'perUnit');
  if (locked) return locked.label;
  return 'Maxed out — you ran the table.';
}

export function evaluateLeaderboardScore(facts: LeaderboardFacts): EvaluatedScore {
  const awards: EvaluatedAward[] = [];

  pushOnce(awards, once('profile_photo', 'profile', 'Add a profile photo', 25, PROFILE_EDIT), facts.hasPhoto);
  pushOnce(awards, once('profile_bio', 'profile', 'Write a short bio', 20, PROFILE_EDIT), facts.hasBio);
  pushOnce(awards, once('profile_linkedin', 'profile', 'Add your LinkedIn', 20, PROFILE_EDIT), facts.hasLinkedIn);
  pushOnce(awards, once('profile_phone', 'profile', 'Add a phone number', 10, PROFILE_EDIT), facts.hasPhone);
  pushOnce(awards, once('profile_job', 'profile', 'Add your job title', 10, PROFILE_EDIT), facts.hasJobTitle);
  pushOnce(awards, once('profile_expertise', 'profile', 'Add an expertise tag', 15, PROFILE_EDIT), facts.hasExpertise);
  awards.push({
    id: 'profile_expertise_3',
    category: 'profile',
    label: 'Add 3 areas of expertise',
    href: PROFILE_EDIT,
    kind: 'milestone',
    points: 20,
    threshold: 3,
    earned: facts.expertiseCount >= 3,
    pointsEarned: facts.expertiseCount >= 3 ? 20 : 0,
    progress: {
      current: Math.min(facts.expertiseCount, 3),
      target: 3,
    },
    detail: `${facts.expertiseCount} of 3 areas`,
  });

  pushOnce(awards, once('profile_affiliation', 'profile', 'Add an affiliation', 10, PROFILE_EDIT), facts.hasAffiliation);
  pushOnce(awards, once('profile_education', 'profile', 'Add education', 10, PROFILE_EDIT), facts.hasEducation);
  pushOnce(awards, once('profile_interest', 'profile', 'Add an interest', 10, PROFILE_EDIT), facts.hasInterest);
  pushOnce(awards, once('profile_resume', 'profile', 'Upload a resume', 15, PROFILE_EDIT), facts.hasResume);

  const profileComplete =
    facts.hasPhoto &&
    facts.hasBio &&
    facts.hasLinkedIn &&
    facts.hasPhone &&
    facts.hasJobTitle &&
    facts.hasExpertise &&
    facts.hasAffiliation &&
    facts.hasEducation &&
    facts.hasInterest;
  pushOnce(
    awards,
    once('profile_complete', 'profile', 'Complete your profile', 80, PROFILE_EDIT),
    profileComplete,
  );

  pushOnce(
    awards,
    once('connection_first', 'networking', 'Make your first connection', 25, COMMUNITY),
    facts.acceptedConnections >= 1,
  );
  for (const milestone of CONNECTION_MILESTONES) {
    const earned = facts.acceptedConnections >= milestone.threshold;
    awards.push({
      id: milestone.id,
      category: 'networking',
      label: milestone.label,
      href: COMMUNITY,
      kind: 'milestone',
      points: milestone.points,
      threshold: milestone.threshold,
      earned,
      pointsEarned: earned ? milestone.points : 0,
      progress: {
        current: Math.min(facts.acceptedConnections, milestone.threshold),
        target: milestone.threshold,
      },
      detail: `${facts.acceptedConnections} of ${milestone.threshold} connections`,
    });
  }
  pushOnce(
    awards,
    once('request_send_5', 'networking', 'Send 5 contact requests', 25, COMMUNITY),
    facts.sentRequests >= 5,
  );

  const stampPoints = facts.stamps * PASSPORT_POINTS_PER_STAMP;
  awards.push({
    id: 'passport_stamps',
    category: 'passport',
    label: 'Collect exhibitor stamps',
    href: PASSPORT,
    kind: 'perUnit',
    points: PASSPORT_POINTS_PER_STAMP,
    earned: facts.stamps > 0,
    pointsEarned: stampPoints,
    progress: { current: facts.stamps, target: Math.max(facts.stampTotal, 1) },
    detail: `${facts.stamps} stamp${facts.stamps === 1 ? '' : 's'} · ${stampPoints} pts`,
  });
  pushOnce(
    awards,
    once('passport_complete', 'passport', 'Complete the Passport Challenge', 50, PASSPORT),
    facts.stampTotal > 0 && facts.stamps >= facts.stampTotal,
  );

  pushOnce(
    awards,
    once('favorite_session_first', 'explore', 'Favorite a session', 10, AGENDA),
    facts.favoriteSessions >= 1,
  );
  pushOnce(
    awards,
    once('favorite_session_5', 'explore', 'Favorite 5 sessions', 20, AGENDA),
    facts.favoriteSessions >= 5,
  );
  pushOnce(
    awards,
    once('favorite_exhibitor', 'explore', 'Favorite an exhibitor', 10, EXHIBITORS),
    facts.favoriteExhibitors >= 1,
  );
  awards.push({
    id: 'favorite_exhibitor_5',
    category: 'explore',
    label: 'Favorite 5 exhibitors',
    href: EXHIBITORS,
    kind: 'milestone',
    points: 20,
    threshold: 5,
    earned: facts.favoriteExhibitors >= 5,
    pointsEarned: facts.favoriteExhibitors >= 5 ? 20 : 0,
    progress: { current: Math.min(facts.favoriteExhibitors, 5), target: 5 },
    detail: `${facts.favoriteExhibitors} of 5 exhibitors`,
  });
  pushOnce(
    awards,
    once('favorite_speaker', 'explore', 'Favorite a speaker', 10, SPEAKERS),
    facts.favoriteSpeakers >= 1,
  );
  awards.push({
    id: 'favorite_speaker_3',
    category: 'explore',
    label: 'Favorite 3 speakers',
    href: SPEAKERS,
    kind: 'milestone',
    points: 15,
    threshold: 3,
    earned: facts.favoriteSpeakers >= 3,
    pointsEarned: facts.favoriteSpeakers >= 3 ? 15 : 0,
    progress: { current: Math.min(facts.favoriteSpeakers, 3), target: 3 },
    detail: `${facts.favoriteSpeakers} of 3 speakers`,
  });
  pushOnce(
    awards,
    once('favorite_sponsor', 'explore', 'Favorite a sponsor', 10, SPONSORS),
    facts.favoriteSponsors >= 1,
  );
  pushOnce(
    awards,
    once('note_session', 'explore', 'Write a session note', 15, AGENDA),
    facts.sessionNotes >= 1,
  );
  awards.push({
    id: 'note_session_5',
    category: 'explore',
    label: 'Write 5 session notes',
    href: AGENDA,
    kind: 'milestone',
    points: 20,
    threshold: 5,
    earned: facts.sessionNotes >= 5,
    pointsEarned: facts.sessionNotes >= 5 ? 20 : 0,
    progress: { current: Math.min(facts.sessionNotes, 5), target: 5 },
    detail: `${facts.sessionNotes} of 5 session notes`,
  });
  pushOnce(
    awards,
    once('note_contact', 'explore', 'Write a contact note', 15, COMMUNITY),
    facts.contactNotes >= 1,
  );
  awards.push({
    id: 'note_contact_5',
    category: 'explore',
    label: 'Write 5 contact notes',
    href: COMMUNITY,
    kind: 'milestone',
    points: 20,
    threshold: 5,
    earned: facts.contactNotes >= 5,
    pointsEarned: facts.contactNotes >= 5 ? 20 : 0,
    progress: { current: Math.min(facts.contactNotes, 5), target: 5 },
    detail: `${facts.contactNotes} of 5 contact notes`,
  });
  pushOnce(
    awards,
    once('exhibitor_views_10', 'explore', 'Visit 10 exhibitor profiles', 10, EXHIBITORS),
    facts.exhibitorViews >= 10,
  );
  pushOnce(
    awards,
    once('announcements_3', 'explore', 'Open 3 announcements', 10, ANNOUNCEMENTS),
    facts.announcementOpens >= 3,
  );
  pushOnce(awards, once('first_dm', 'explore', 'Send your first message', 10, MESSAGES), facts.sentDms >= 1);

  FEEDBACK_POINTS.forEach((points, index) => {
    const n = index + 1;
    pushOnce(
      awards,
      once(
        `feedback_${n}`,
        'feedback',
        n === 1 ? 'Submit app feedback' : `Submit feedback again (${n})`,
        points,
        FEEDBACK,
      ),
      facts.feedbackCount >= n,
    );
  });

  const categoryTotals: Record<AwardCategoryId, number> = {
    profile: 0,
    networking: 0,
    passport: 0,
    explore: 0,
    feedback: 0,
  };
  let total = 0;
  for (const award of awards) {
    total += award.pointsEarned;
    categoryTotals[award.category] += award.pointsEarned;
  }

  return {
    total,
    awards,
    categoryTotals,
    nextHint: nextHintFor(facts, awards),
    counts: {
      connections: facts.acceptedConnections,
      sentRequests: facts.sentRequests,
      stamps: facts.stamps,
      stampTotal: facts.stampTotal,
      feedback: facts.feedbackCount,
    },
  };
}

export function leaderboardDisplayName(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  return name || 'Attendee';
}

export function scoreBreakdownPayload(score: EvaluatedScore) {
  const awards: Record<string, number> = {};
  for (const award of score.awards) {
    if (award.pointsEarned > 0) awards[award.id] = award.pointsEarned;
  }
  return {
    awards,
    categories: score.categoryTotals,
    counts: score.counts,
  };
}
