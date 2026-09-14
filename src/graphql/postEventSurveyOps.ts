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
