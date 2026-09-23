export const getApsPostEventSurvey = /* GraphQL */ `
  query GetApsPostEventSurvey($id: ID!) {
    getApsPostEventSurvey(id: $id) {
      id
      owner
      eventId
      registrantId
      userId
      surveyKey
      identityType
      mostBeneficial
      leastBeneficial
      summitRating
      gainedValue
      gainedValueComments
      favoritePresentation
      sessionRatings
      networkGrowthRating
      improvementSuggestions
      recommendName
      recommendCompany
      recommendEmail
      recommendPhone
      completedAt
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const apsPostEventSurveysBySurveyKey = /* GraphQL */ `
  query ApsPostEventSurveysBySurveyKey($surveyKey: String!, $limit: Int) {
    apsPostEventSurveysBySurveyKey(surveyKey: $surveyKey, limit: $limit) {
      items {
        id
        registrantId
        surveyKey
        completedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const getPostEventSurveyOpen = /* GraphQL */ `
  query GetPostEventSurveyOpen($id: ID!) {
    getAPS(id: $id) {
      id
      postEventSurveyOpen
      __typename
    }
  }
`;

export const setPostEventSurveyOpen = /* GraphQL */ `
  mutation SetPostEventSurveyOpen($input: UpdateAPSInput!) {
    updateAPS(input: $input) {
      id
      postEventSurveyOpen
      __typename
    }
  }
`;

export const adminPostEventSurveysByEvent = /* GraphQL */ `
  query AdminPostEventSurveysByEvent(
    $eventId: ID!
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    apsPostEventSurveysByEventIdAndCreatedAt(
      eventId: $eventId
      sortDirection: $sortDirection
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        registrantId
        identityType
        mostBeneficial
        leastBeneficial
        summitRating
        gainedValue
        gainedValueComments
        favoritePresentation
        sessionRatings
        networkGrowthRating
        improvementSuggestions
        recommendName
        recommendCompany
        recommendEmail
        recommendPhone
        completedAt
        registrant {
          id
          firstName
          lastName
          email
          company {
            id
            name
            __typename
          }
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const deleteApsPostEventSurvey = /* GraphQL */ `
  mutation DeleteApsPostEventSurvey($input: DeleteApsPostEventSurveyInput!) {
    deleteApsPostEventSurvey(input: $input) {
      id
      __typename
    }
  }
`;

export const createApsPostEventSurvey = /* GraphQL */ `
  mutation CreateApsPostEventSurvey($input: CreateApsPostEventSurveyInput!) {
    createApsPostEventSurvey(input: $input) {
      id
      owner
      eventId
      registrantId
      userId
      surveyKey
      identityType
      mostBeneficial
      leastBeneficial
      summitRating
      gainedValue
      gainedValueComments
      favoritePresentation
      sessionRatings
      networkGrowthRating
      improvementSuggestions
      recommendName
      recommendCompany
      recommendEmail
      recommendPhone
      completedAt
      createdAt
      updatedAt
      __typename
    }
  }
`;
