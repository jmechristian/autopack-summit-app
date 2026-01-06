// src/graphql/customQueries.ts
// Custom GraphQL queries with full nested data for APS event

export const getAPSBasic = /* GraphQL */ `
  query GetAPSBasic($id: ID!) {
    getAPS(id: $id) {
      id
      year
      codes
      createdAt
      updatedAt
      __typename
    }
  }
`;

// Query to get registrant by email
export const getRegistrantByEmail = /* GraphQL */ `
  query GetRegistrantByEmail($apsID: ID!, $email: String!) {
    apsRegistrantsByApsID(
      apsID: $apsID
      filter: { email: { eq: $email } }
      limit: 1
    ) {
      items {
        id
        apsID
        firstName
        lastName
        email
        phone
        companyId
        company {
          id
          name
          email
          type
          description
          website
          phone
          logo
          __typename
        }
        jobTitle
        attendeeType
        interests
        status
        headshot
        bio
        qrCode
        createdAt
        updatedAt
        __typename
      }
    }
  }
`;

// Query to get app user by registrant ID with full profile
export const getAppUserByRegistrantId = /* GraphQL */ `
  query GetAppUserByRegistrantId($registrantId: ID!) {
    apsAppUsersByRegistrantId(
      registrantId: $registrantId
      limit: 1
    ) {
      items {
        id
        registrantId
        registrant {
          id
          apsID
          firstName
          lastName
          email
          phone
          companyId
          company {
            id
            name
            email
            type
            description
            website
            phone
            logo
            __typename
          }
          jobTitle
          attendeeType
          interests
          status
          headshot
          bio
          qrCode
          __typename
        }
        profile {
          id
          userId
          firstName
          lastName
          email
          phone
          company
          jobTitle
          attendeeType
          profilePicture
          bio
          linkedin
          twitter
          facebook
          instagram
          youtube
          website
          location
          resume
          affiliates {
            items {
              id
              affiliate
              role
              startDate
              endDate
              __typename
            }
            __typename
          }
          education {
            items {
              id
              school
              degree
              fieldOfStudy
              __typename
            }
            __typename
          }
          interests {
            items {
              id
              interest
              __typename
            }
            __typename
          }
          createdAt
          updatedAt
          __typename
        }
        photos {
          items {
            id
            photo
            caption
            approved
            eventId
            __typename
          }
          __typename
        }
        createdAt
        updatedAt
        __typename
      }
    }
  }
`;

export const getAPSWithAgenda = /* GraphQL */ `
  query GetAPSWithAgenda($id: ID!) {
    getAPS(id: $id) {
      id
      year
      codes
      agenda {
        id
        eventId
        items {
          items {
            id
            session
            date
            time
            location
            sessionQuestions {
              items {
                id
                question
                userId
                createdAt
                __typename
              }
              __typename
            }
            createdAt
            updatedAt
            __typename
          }
          nextToken
          __typename
        }
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const getAPSWithRegistrants = /* GraphQL */ `
  query GetAPSWithRegistrants($id: ID!, $limit: Int, $nextToken: String) {
    getAPS(id: $id) {
      id
      year
      codes
      Registrants(limit: $limit, nextToken: $nextToken) {
        items {
          id
          apsID
          firstName
          lastName
          email
          phone
          companyId
          company {
            id
            name
            email
            type
            logo
            __typename
          }
          jobTitle
          attendeeType
          interests
          status
          headshot
          bio
          qrCode
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const getAPSWithSpeakers = /* GraphQL */ `
  query GetAPSWithSpeakers($id: ID!, $eventId: ID!) {
    getAPS(id: $id) {
      id
      year
      codes
      __typename
    }
    aPSSpeakersByEventId(eventId: $eventId) {
      items {
        id
        firstName
        lastName
        email
        company
        title
        phone
        linkedin
        bio
        presentationTitle
        presentationSummary
        headshot
        mediaConsent
        privacyConsent
        eventId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

// Agenda (live)
// Notes:
// - Some generated TS types/queries in src/API.ts + src/graphql/queries.ts may lag behind the
//   backend schema. These queries are intentionally "best effort" and the app code normalizes
//   fields defensively (title vs session, startTime vs time, etc).
// - We prefer paging via the byAgenda index instead of nested agenda.items.
export const apsAppSessionsByAgendaIdWithRelations = /* GraphQL */ `
  query ApsAppSessionsByAgendaIdWithRelations($agendaId: ID!, $limit: Int, $nextToken: String) {
    apsAppSessionsByAgendaId(agendaId: $agendaId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        date
        startTime
        endTime
        location
        description
        speakers {
          items {
            id
            aPSSpeaker {
              id
              firstName
              lastName
              company
              title
              headshot
              __typename
            }
            __typename
          }
          nextToken
          __typename
        }
        sponsors {
          items {
            id
            apsSponsor {
              id
              company {
                id
                name
                logo
                __typename
              }
              __typename
            }
            __typename
          }
          nextToken
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const getApsAppSessionWithRelations = /* GraphQL */ `
  query GetApsAppSessionWithRelations($id: ID!) {
    getApsAppSession(id: $id) {
      id
      title
      date
      startTime
      endTime
      location
      description
      speakers {
        items {
          id
          aPSSpeaker {
            id
            firstName
            lastName
            company
            title
            headshot
            __typename
          }
          __typename
        }
        nextToken
        __typename
      }
      sponsors {
        items {
          id
          apsSponsor {
            id
            company {
              id
              name
              logo
              __typename
            }
            __typename
          }
          __typename
        }
        nextToken
        __typename
      }
      __typename
    }
  }
`;

export const getAPSWithExhibitors = /* GraphQL */ `
  query GetAPSWithExhibitors($id: ID!, $eventId: ID!) {
    getAPS(id: $id) {
      id
      year
      codes
      __typename
    }
    apsAppExhibitorProfilesByEventId(eventId: $eventId) {
      items {
        id
        companyId
        company {
          id
          name
          email
          type
          description
          website
          phone
          logo
          __typename
        }
        sponsorId
        title
        phone
        eventId
        deals {
          items {
            id
            deal
            link
            __typename
          }
          __typename
        }
        photos {
          items {
            id
            photo
            caption
            approved
            __typename
          }
          __typename
        }
        handouts {
          items {
            id
            handout
            __typename
          }
          __typename
        }
        promotions {
          items {
            id
            promotion
            link
            __typename
          }
          __typename
        }
        video
        videoCaption
        boothNumber
        visits
        views
        likes
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const getAPSWithAddOns = /* GraphQL */ `
  query GetAPSWithAddOns($id: ID!, $eventId: ID!) {
    getAPS(id: $id) {
      id
      year
      codes
      __typename
    }
    apsAddOnsByEventId(eventId: $eventId) {
      items {
        id
        title
        description
        subheadline
        location
        date
        time
        company
        altLink
        type
        limit
        eventId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

// Community: list all app users with full nested profile data
export const listApsAppUsersWithProfiles = /* GraphQL */ `
  query ListApsAppUsersWithProfiles($limit: Int, $nextToken: String) {
    listApsAppUsers(limit: $limit, nextToken: $nextToken) {
      items {
        id
        profile {
          firstName
          id
          lastName
          email
          company
          jobTitle
          profilePicture
          location
          userId
        }
      }
      nextToken
    }
  }
`;

// Community: get a single user's profile by app user id (userId) with nested relations
export const getCommunityProfileByUserId = /* GraphQL */ `
  query GetCommunityProfileByUserId($userId: ID!) {
    apsAppUserProfilesByUserId(userId: $userId, limit: 1) {
      items {
        id
        userId
        firstName
        lastName
        email
        phone
        company
        jobTitle
        profilePicture
        bio
        linkedin
        twitter
        facebook
        instagram
        youtube
        website
        location
        resume
        affiliates {
          items {
            id
            affiliate
            role
            startDate
            endDate
            createdAt
          }
        }
        education {
          items {
            id
            school
            degree
            fieldOfStudy
            createdAt
          }
        }
        interests {
          items {
            id
            interest
            createdAt
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

// Community: get a single profile by profile id with nested relations
export const getCommunityProfileByProfileId = /* GraphQL */ `
  query GetCommunityProfileByProfileId($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      userId
      firstName
      lastName
      email
      phone
      company
      jobTitle
      attendeeType
      profilePicture
      bio
      linkedin
      twitter
      facebook
      instagram
      youtube
      website
      location
      resume
      affiliates {
        items {
          id
          affiliate
          role
          startDate
          endDate
          createdAt
          __typename
        }
        __typename
      }
      education {
        items {
          id
          school
          degree
          fieldOfStudy
          createdAt
          __typename
        }
        __typename
      }
      interests {
        items {
          id
          interest
          createdAt
          __typename
        }
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;

