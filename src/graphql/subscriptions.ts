/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateAPS = /* GraphQL */ `subscription OnCreateAPS($filter: ModelSubscriptionAPSFilterInput) {
  onCreateAPS(filter: $filter) {
    id
    year
    codes
    agenda {
      id
      eventId
      createdAt
      updatedAt
      __typename
    }
    Registrants {
      nextToken
      __typename
    }
    Sponsors {
      nextToken
      __typename
    }
    Speakers {
      nextToken
      __typename
    }
    Companies {
      nextToken
      __typename
    }
    photos {
      nextToken
      __typename
    }
    exhibitors {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    exhibitorPromotions {
      nextToken
      __typename
    }
    exhibitorDeals {
      nextToken
      __typename
    }
    exhibitorPhotos {
      nextToken
      __typename
    }
    exhibitorHandouts {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSAgendaId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateAPSSubscriptionVariables,
  APITypes.OnCreateAPSSubscription
>;
export const onUpdateAPS = /* GraphQL */ `subscription OnUpdateAPS($filter: ModelSubscriptionAPSFilterInput) {
  onUpdateAPS(filter: $filter) {
    id
    year
    codes
    agenda {
      id
      eventId
      createdAt
      updatedAt
      __typename
    }
    Registrants {
      nextToken
      __typename
    }
    Sponsors {
      nextToken
      __typename
    }
    Speakers {
      nextToken
      __typename
    }
    Companies {
      nextToken
      __typename
    }
    photos {
      nextToken
      __typename
    }
    exhibitors {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    exhibitorPromotions {
      nextToken
      __typename
    }
    exhibitorDeals {
      nextToken
      __typename
    }
    exhibitorPhotos {
      nextToken
      __typename
    }
    exhibitorHandouts {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSAgendaId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateAPSSubscriptionVariables,
  APITypes.OnUpdateAPSSubscription
>;
export const onDeleteAPS = /* GraphQL */ `subscription OnDeleteAPS($filter: ModelSubscriptionAPSFilterInput) {
  onDeleteAPS(filter: $filter) {
    id
    year
    codes
    agenda {
      id
      eventId
      createdAt
      updatedAt
      __typename
    }
    Registrants {
      nextToken
      __typename
    }
    Sponsors {
      nextToken
      __typename
    }
    Speakers {
      nextToken
      __typename
    }
    Companies {
      nextToken
      __typename
    }
    photos {
      nextToken
      __typename
    }
    exhibitors {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    exhibitorPromotions {
      nextToken
      __typename
    }
    exhibitorDeals {
      nextToken
      __typename
    }
    exhibitorPhotos {
      nextToken
      __typename
    }
    exhibitorHandouts {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSAgendaId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteAPSSubscriptionVariables,
  APITypes.OnDeleteAPSSubscription
>;
export const onCreateAPSBoard = /* GraphQL */ `subscription OnCreateAPSBoard($filter: ModelSubscriptionAPSBoardFilterInput) {
  onCreateAPSBoard(filter: $filter) {
    id
    name
    title
    bio
    company
    email
    linkedin
    profilePic
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateAPSBoardSubscriptionVariables,
  APITypes.OnCreateAPSBoardSubscription
>;
export const onUpdateAPSBoard = /* GraphQL */ `subscription OnUpdateAPSBoard($filter: ModelSubscriptionAPSBoardFilterInput) {
  onUpdateAPSBoard(filter: $filter) {
    id
    name
    title
    bio
    company
    email
    linkedin
    profilePic
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateAPSBoardSubscriptionVariables,
  APITypes.OnUpdateAPSBoardSubscription
>;
export const onDeleteAPSBoard = /* GraphQL */ `subscription OnDeleteAPSBoard($filter: ModelSubscriptionAPSBoardFilterInput) {
  onDeleteAPSBoard(filter: $filter) {
    id
    name
    title
    bio
    company
    email
    linkedin
    profilePic
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteAPSBoardSubscriptionVariables,
  APITypes.OnDeleteAPSBoardSubscription
>;
export const onCreateApsAgenda = /* GraphQL */ `subscription OnCreateApsAgenda($filter: ModelSubscriptionApsAgendaFilterInput) {
  onCreateApsAgenda(filter: $filter) {
    id
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    items {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAgendaSubscriptionVariables,
  APITypes.OnCreateApsAgendaSubscription
>;
export const onUpdateApsAgenda = /* GraphQL */ `subscription OnUpdateApsAgenda($filter: ModelSubscriptionApsAgendaFilterInput) {
  onUpdateApsAgenda(filter: $filter) {
    id
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    items {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAgendaSubscriptionVariables,
  APITypes.OnUpdateApsAgendaSubscription
>;
export const onDeleteApsAgenda = /* GraphQL */ `subscription OnDeleteApsAgenda($filter: ModelSubscriptionApsAgendaFilterInput) {
  onDeleteApsAgenda(filter: $filter) {
    id
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    items {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAgendaSubscriptionVariables,
  APITypes.OnDeleteApsAgendaSubscription
>;
export const onCreateApsRegistrant = /* GraphQL */ `subscription OnCreateApsRegistrant(
  $filter: ModelSubscriptionApsRegistrantFilterInput
) {
  onCreateApsRegistrant(filter: $filter) {
    id
    apsID
    aps {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    jobTitle
    attendeeType
    termsAccepted
    interests
    otherInterest
    speedNetworking
    speedNetworkingStatus
    billingAddressFirstName
    billingAddressLastName
    billingAddressEmail
    billingAddressPhone
    billingAddressStreet
    billingAddressCity
    billingAddressState
    billingAddressZip
    sameAsAttendee
    speakerTopic
    learningObjectives
    totalAmount
    discountCode
    status
    morrisetteTransportation
    morrisetteStatus
    aristoTransportation
    aristoStatus
    magnaTransportation
    magnaStatus
    paymentConfirmation
    registrationEmailSent
    registrationEmailSentDate
    registrationEmailReceived
    registrationEmailReceivedDate
    welcomeEmailSent
    welcomeEmailSentDate
    welcomeEmailReceived
    welcomeEmailReceivedDate
    paymentMethod
    paymentLast4
    approvedAt
    headshot
    presentation
    presentationTitle
    presentationSummary
    bio
    seatingChartRegistrant {
      id
      category
      firstName
      lastName
      company
      email
      role
      tableNumber
      notes
      seatingChartID
      registrantID
      createdAt
      updatedAt
      apsSeatingChartRegistrantsId
      __typename
    }
    appUser {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    aPSRegistrantsId
    aPSCompanyRegistrantsId
    apsRegistrantSeatingChartRegistrantId
    apsRegistrantAppUserId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsRegistrantSubscriptionVariables,
  APITypes.OnCreateApsRegistrantSubscription
>;
export const onUpdateApsRegistrant = /* GraphQL */ `subscription OnUpdateApsRegistrant(
  $filter: ModelSubscriptionApsRegistrantFilterInput
) {
  onUpdateApsRegistrant(filter: $filter) {
    id
    apsID
    aps {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    jobTitle
    attendeeType
    termsAccepted
    interests
    otherInterest
    speedNetworking
    speedNetworkingStatus
    billingAddressFirstName
    billingAddressLastName
    billingAddressEmail
    billingAddressPhone
    billingAddressStreet
    billingAddressCity
    billingAddressState
    billingAddressZip
    sameAsAttendee
    speakerTopic
    learningObjectives
    totalAmount
    discountCode
    status
    morrisetteTransportation
    morrisetteStatus
    aristoTransportation
    aristoStatus
    magnaTransportation
    magnaStatus
    paymentConfirmation
    registrationEmailSent
    registrationEmailSentDate
    registrationEmailReceived
    registrationEmailReceivedDate
    welcomeEmailSent
    welcomeEmailSentDate
    welcomeEmailReceived
    welcomeEmailReceivedDate
    paymentMethod
    paymentLast4
    approvedAt
    headshot
    presentation
    presentationTitle
    presentationSummary
    bio
    seatingChartRegistrant {
      id
      category
      firstName
      lastName
      company
      email
      role
      tableNumber
      notes
      seatingChartID
      registrantID
      createdAt
      updatedAt
      apsSeatingChartRegistrantsId
      __typename
    }
    appUser {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    aPSRegistrantsId
    aPSCompanyRegistrantsId
    apsRegistrantSeatingChartRegistrantId
    apsRegistrantAppUserId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsRegistrantSubscriptionVariables,
  APITypes.OnUpdateApsRegistrantSubscription
>;
export const onDeleteApsRegistrant = /* GraphQL */ `subscription OnDeleteApsRegistrant(
  $filter: ModelSubscriptionApsRegistrantFilterInput
) {
  onDeleteApsRegistrant(filter: $filter) {
    id
    apsID
    aps {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    jobTitle
    attendeeType
    termsAccepted
    interests
    otherInterest
    speedNetworking
    speedNetworkingStatus
    billingAddressFirstName
    billingAddressLastName
    billingAddressEmail
    billingAddressPhone
    billingAddressStreet
    billingAddressCity
    billingAddressState
    billingAddressZip
    sameAsAttendee
    speakerTopic
    learningObjectives
    totalAmount
    discountCode
    status
    morrisetteTransportation
    morrisetteStatus
    aristoTransportation
    aristoStatus
    magnaTransportation
    magnaStatus
    paymentConfirmation
    registrationEmailSent
    registrationEmailSentDate
    registrationEmailReceived
    registrationEmailReceivedDate
    welcomeEmailSent
    welcomeEmailSentDate
    welcomeEmailReceived
    welcomeEmailReceivedDate
    paymentMethod
    paymentLast4
    approvedAt
    headshot
    presentation
    presentationTitle
    presentationSummary
    bio
    seatingChartRegistrant {
      id
      category
      firstName
      lastName
      company
      email
      role
      tableNumber
      notes
      seatingChartID
      registrantID
      createdAt
      updatedAt
      apsSeatingChartRegistrantsId
      __typename
    }
    appUser {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    aPSRegistrantsId
    aPSCompanyRegistrantsId
    apsRegistrantSeatingChartRegistrantId
    apsRegistrantAppUserId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsRegistrantSubscriptionVariables,
  APITypes.OnDeleteApsRegistrantSubscription
>;
export const onCreateApsAppUser = /* GraphQL */ `subscription OnCreateApsAppUser(
  $filter: ModelSubscriptionApsAppUserFilterInput
) {
  onCreateApsAppUser(filter: $filter) {
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
      jobTitle
      attendeeType
      termsAccepted
      interests
      otherInterest
      speedNetworking
      speedNetworkingStatus
      billingAddressFirstName
      billingAddressLastName
      billingAddressEmail
      billingAddressPhone
      billingAddressStreet
      billingAddressCity
      billingAddressState
      billingAddressZip
      sameAsAttendee
      speakerTopic
      learningObjectives
      totalAmount
      discountCode
      status
      morrisetteTransportation
      morrisetteStatus
      aristoTransportation
      aristoStatus
      magnaTransportation
      magnaStatus
      paymentConfirmation
      registrationEmailSent
      registrationEmailSentDate
      registrationEmailReceived
      registrationEmailReceivedDate
      welcomeEmailSent
      welcomeEmailSentDate
      welcomeEmailReceived
      welcomeEmailReceivedDate
      paymentMethod
      paymentLast4
      approvedAt
      headshot
      presentation
      presentationTitle
      presentationSummary
      bio
      createdAt
      updatedAt
      aPSRegistrantsId
      aPSCompanyRegistrantsId
      apsRegistrantSeatingChartRegistrantId
      apsRegistrantAppUserId
      __typename
    }
    qrCode
    photos {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    sessionQuestions {
      nextToken
      __typename
    }
    exhibitorDeals {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppUserSubscriptionVariables,
  APITypes.OnCreateApsAppUserSubscription
>;
export const onUpdateApsAppUser = /* GraphQL */ `subscription OnUpdateApsAppUser(
  $filter: ModelSubscriptionApsAppUserFilterInput
) {
  onUpdateApsAppUser(filter: $filter) {
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
      jobTitle
      attendeeType
      termsAccepted
      interests
      otherInterest
      speedNetworking
      speedNetworkingStatus
      billingAddressFirstName
      billingAddressLastName
      billingAddressEmail
      billingAddressPhone
      billingAddressStreet
      billingAddressCity
      billingAddressState
      billingAddressZip
      sameAsAttendee
      speakerTopic
      learningObjectives
      totalAmount
      discountCode
      status
      morrisetteTransportation
      morrisetteStatus
      aristoTransportation
      aristoStatus
      magnaTransportation
      magnaStatus
      paymentConfirmation
      registrationEmailSent
      registrationEmailSentDate
      registrationEmailReceived
      registrationEmailReceivedDate
      welcomeEmailSent
      welcomeEmailSentDate
      welcomeEmailReceived
      welcomeEmailReceivedDate
      paymentMethod
      paymentLast4
      approvedAt
      headshot
      presentation
      presentationTitle
      presentationSummary
      bio
      createdAt
      updatedAt
      aPSRegistrantsId
      aPSCompanyRegistrantsId
      apsRegistrantSeatingChartRegistrantId
      apsRegistrantAppUserId
      __typename
    }
    qrCode
    photos {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    sessionQuestions {
      nextToken
      __typename
    }
    exhibitorDeals {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppUserSubscriptionVariables,
  APITypes.OnUpdateApsAppUserSubscription
>;
export const onDeleteApsAppUser = /* GraphQL */ `subscription OnDeleteApsAppUser(
  $filter: ModelSubscriptionApsAppUserFilterInput
) {
  onDeleteApsAppUser(filter: $filter) {
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
      jobTitle
      attendeeType
      termsAccepted
      interests
      otherInterest
      speedNetworking
      speedNetworkingStatus
      billingAddressFirstName
      billingAddressLastName
      billingAddressEmail
      billingAddressPhone
      billingAddressStreet
      billingAddressCity
      billingAddressState
      billingAddressZip
      sameAsAttendee
      speakerTopic
      learningObjectives
      totalAmount
      discountCode
      status
      morrisetteTransportation
      morrisetteStatus
      aristoTransportation
      aristoStatus
      magnaTransportation
      magnaStatus
      paymentConfirmation
      registrationEmailSent
      registrationEmailSentDate
      registrationEmailReceived
      registrationEmailReceivedDate
      welcomeEmailSent
      welcomeEmailSentDate
      welcomeEmailReceived
      welcomeEmailReceivedDate
      paymentMethod
      paymentLast4
      approvedAt
      headshot
      presentation
      presentationTitle
      presentationSummary
      bio
      createdAt
      updatedAt
      aPSRegistrantsId
      aPSCompanyRegistrantsId
      apsRegistrantSeatingChartRegistrantId
      apsRegistrantAppUserId
      __typename
    }
    qrCode
    photos {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    sessionQuestions {
      nextToken
      __typename
    }
    exhibitorDeals {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppUserSubscriptionVariables,
  APITypes.OnDeleteApsAppUserSubscription
>;
export const onCreateApsAppUserPhoto = /* GraphQL */ `subscription OnCreateApsAppUserPhoto(
  $filter: ModelSubscriptionApsAppUserPhotoFilterInput
) {
  onCreateApsAppUserPhoto(filter: $filter) {
    id
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    photo
    caption
    approved
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSPhotosId
    apsAppUserPhotosId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppUserPhotoSubscriptionVariables,
  APITypes.OnCreateApsAppUserPhotoSubscription
>;
export const onUpdateApsAppUserPhoto = /* GraphQL */ `subscription OnUpdateApsAppUserPhoto(
  $filter: ModelSubscriptionApsAppUserPhotoFilterInput
) {
  onUpdateApsAppUserPhoto(filter: $filter) {
    id
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    photo
    caption
    approved
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSPhotosId
    apsAppUserPhotosId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppUserPhotoSubscriptionVariables,
  APITypes.OnUpdateApsAppUserPhotoSubscription
>;
export const onDeleteApsAppUserPhoto = /* GraphQL */ `subscription OnDeleteApsAppUserPhoto(
  $filter: ModelSubscriptionApsAppUserPhotoFilterInput
) {
  onDeleteApsAppUserPhoto(filter: $filter) {
    id
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    photo
    caption
    approved
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSPhotosId
    apsAppUserPhotosId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppUserPhotoSubscriptionVariables,
  APITypes.OnDeleteApsAppUserPhotoSubscription
>;
export const onCreateApsAppSession = /* GraphQL */ `subscription OnCreateApsAppSession(
  $filter: ModelSubscriptionApsAppSessionFilterInput
) {
  onCreateApsAppSession(filter: $filter) {
    id
    session
    date
    time
    location
    agendaId
    agenda {
      id
      eventId
      createdAt
      updatedAt
      __typename
    }
    sessionQuestions {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    apsAgendaItemsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppSessionSubscriptionVariables,
  APITypes.OnCreateApsAppSessionSubscription
>;
export const onUpdateApsAppSession = /* GraphQL */ `subscription OnUpdateApsAppSession(
  $filter: ModelSubscriptionApsAppSessionFilterInput
) {
  onUpdateApsAppSession(filter: $filter) {
    id
    session
    date
    time
    location
    agendaId
    agenda {
      id
      eventId
      createdAt
      updatedAt
      __typename
    }
    sessionQuestions {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    apsAgendaItemsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppSessionSubscriptionVariables,
  APITypes.OnUpdateApsAppSessionSubscription
>;
export const onDeleteApsAppSession = /* GraphQL */ `subscription OnDeleteApsAppSession(
  $filter: ModelSubscriptionApsAppSessionFilterInput
) {
  onDeleteApsAppSession(filter: $filter) {
    id
    session
    date
    time
    location
    agendaId
    agenda {
      id
      eventId
      createdAt
      updatedAt
      __typename
    }
    sessionQuestions {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    apsAgendaItemsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppSessionSubscriptionVariables,
  APITypes.OnDeleteApsAppSessionSubscription
>;
export const onCreateApsAppSessionQuestion = /* GraphQL */ `subscription OnCreateApsAppSessionQuestion(
  $filter: ModelSubscriptionApsAppSessionQuestionFilterInput
) {
  onCreateApsAppSessionQuestion(filter: $filter) {
    id
    sessionId
    session {
      id
      session
      date
      time
      location
      agendaId
      createdAt
      updatedAt
      apsAgendaItemsId
      __typename
    }
    question
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    apsAppUserSessionQuestionsId
    apsAppSessionSessionQuestionsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppSessionQuestionSubscriptionVariables,
  APITypes.OnCreateApsAppSessionQuestionSubscription
>;
export const onUpdateApsAppSessionQuestion = /* GraphQL */ `subscription OnUpdateApsAppSessionQuestion(
  $filter: ModelSubscriptionApsAppSessionQuestionFilterInput
) {
  onUpdateApsAppSessionQuestion(filter: $filter) {
    id
    sessionId
    session {
      id
      session
      date
      time
      location
      agendaId
      createdAt
      updatedAt
      apsAgendaItemsId
      __typename
    }
    question
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    apsAppUserSessionQuestionsId
    apsAppSessionSessionQuestionsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppSessionQuestionSubscriptionVariables,
  APITypes.OnUpdateApsAppSessionQuestionSubscription
>;
export const onDeleteApsAppSessionQuestion = /* GraphQL */ `subscription OnDeleteApsAppSessionQuestion(
  $filter: ModelSubscriptionApsAppSessionQuestionFilterInput
) {
  onDeleteApsAppSessionQuestion(filter: $filter) {
    id
    sessionId
    session {
      id
      session
      date
      time
      location
      agendaId
      createdAt
      updatedAt
      apsAgendaItemsId
      __typename
    }
    question
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    createdAt
    updatedAt
    apsAppUserSessionQuestionsId
    apsAppSessionSessionQuestionsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppSessionQuestionSubscriptionVariables,
  APITypes.OnDeleteApsAppSessionQuestionSubscription
>;
export const onCreateAPSSpeaker = /* GraphQL */ `subscription OnCreateAPSSpeaker(
  $filter: ModelSubscriptionAPSSpeakerFilterInput
) {
  onCreateAPSSpeaker(filter: $filter) {
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
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSSpeakersId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateAPSSpeakerSubscriptionVariables,
  APITypes.OnCreateAPSSpeakerSubscription
>;
export const onUpdateAPSSpeaker = /* GraphQL */ `subscription OnUpdateAPSSpeaker(
  $filter: ModelSubscriptionAPSSpeakerFilterInput
) {
  onUpdateAPSSpeaker(filter: $filter) {
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
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSSpeakersId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateAPSSpeakerSubscriptionVariables,
  APITypes.OnUpdateAPSSpeakerSubscription
>;
export const onDeleteAPSSpeaker = /* GraphQL */ `subscription OnDeleteAPSSpeaker(
  $filter: ModelSubscriptionAPSSpeakerFilterInput
) {
  onDeleteAPSSpeaker(filter: $filter) {
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
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSSpeakersId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteAPSSpeakerSubscriptionVariables,
  APITypes.OnDeleteAPSSpeakerSubscription
>;
export const onCreateApsSponsor = /* GraphQL */ `subscription OnCreateApsSponsor(
  $filter: ModelSubscriptionApsSponsorFilterInput
) {
  onCreateApsSponsor(filter: $filter) {
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    profile {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    createdAt
    updatedAt
    aPSSponsorsId
    aPSCompanySponsorsId
    apsSponsorProfileId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsSponsorSubscriptionVariables,
  APITypes.OnCreateApsSponsorSubscription
>;
export const onUpdateApsSponsor = /* GraphQL */ `subscription OnUpdateApsSponsor(
  $filter: ModelSubscriptionApsSponsorFilterInput
) {
  onUpdateApsSponsor(filter: $filter) {
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    profile {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    createdAt
    updatedAt
    aPSSponsorsId
    aPSCompanySponsorsId
    apsSponsorProfileId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsSponsorSubscriptionVariables,
  APITypes.OnUpdateApsSponsorSubscription
>;
export const onDeleteApsSponsor = /* GraphQL */ `subscription OnDeleteApsSponsor(
  $filter: ModelSubscriptionApsSponsorFilterInput
) {
  onDeleteApsSponsor(filter: $filter) {
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    profile {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    createdAt
    updatedAt
    aPSSponsorsId
    aPSCompanySponsorsId
    apsSponsorProfileId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsSponsorSubscriptionVariables,
  APITypes.OnDeleteApsSponsorSubscription
>;
export const onCreateAPSCompany = /* GraphQL */ `subscription OnCreateAPSCompany(
  $filter: ModelSubscriptionAPSCompanyFilterInput
) {
  onCreateAPSCompany(filter: $filter) {
    id
    name
    email
    type
    description
    website
    phone
    address
    city
    state
    zip
    country
    logo
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    registrants {
      nextToken
      __typename
    }
    sponsors {
      nextToken
      __typename
    }
    exhibitorProfiles {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSCompaniesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateAPSCompanySubscriptionVariables,
  APITypes.OnCreateAPSCompanySubscription
>;
export const onUpdateAPSCompany = /* GraphQL */ `subscription OnUpdateAPSCompany(
  $filter: ModelSubscriptionAPSCompanyFilterInput
) {
  onUpdateAPSCompany(filter: $filter) {
    id
    name
    email
    type
    description
    website
    phone
    address
    city
    state
    zip
    country
    logo
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    registrants {
      nextToken
      __typename
    }
    sponsors {
      nextToken
      __typename
    }
    exhibitorProfiles {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSCompaniesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateAPSCompanySubscriptionVariables,
  APITypes.OnUpdateAPSCompanySubscription
>;
export const onDeleteAPSCompany = /* GraphQL */ `subscription OnDeleteAPSCompany(
  $filter: ModelSubscriptionAPSCompanyFilterInput
) {
  onDeleteAPSCompany(filter: $filter) {
    id
    name
    email
    type
    description
    website
    phone
    address
    city
    state
    zip
    country
    logo
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    registrants {
      nextToken
      __typename
    }
    sponsors {
      nextToken
      __typename
    }
    exhibitorProfiles {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSCompaniesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteAPSCompanySubscriptionVariables,
  APITypes.OnDeleteAPSCompanySubscription
>;
export const onCreateApsAppExhibitorProfile = /* GraphQL */ `subscription OnCreateApsAppExhibitorProfile(
  $filter: ModelSubscriptionApsAppExhibitorProfileFilterInput
) {
  onCreateApsAppExhibitorProfile(filter: $filter) {
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    sponsorId
    sponsor {
      id
      companyId
      eventId
      createdAt
      updatedAt
      aPSSponsorsId
      aPSCompanySponsorsId
      apsSponsorProfileId
      __typename
    }
    title
    phone
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    deals {
      nextToken
      __typename
    }
    photos {
      nextToken
      __typename
    }
    handouts {
      nextToken
      __typename
    }
    promotions {
      nextToken
      __typename
    }
    video
    videoCaption
    boothNumber
    visits
    views
    likes
    inquiries {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorsId
    aPSCompanyExhibitorProfilesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppExhibitorProfileSubscriptionVariables,
  APITypes.OnCreateApsAppExhibitorProfileSubscription
>;
export const onUpdateApsAppExhibitorProfile = /* GraphQL */ `subscription OnUpdateApsAppExhibitorProfile(
  $filter: ModelSubscriptionApsAppExhibitorProfileFilterInput
) {
  onUpdateApsAppExhibitorProfile(filter: $filter) {
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    sponsorId
    sponsor {
      id
      companyId
      eventId
      createdAt
      updatedAt
      aPSSponsorsId
      aPSCompanySponsorsId
      apsSponsorProfileId
      __typename
    }
    title
    phone
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    deals {
      nextToken
      __typename
    }
    photos {
      nextToken
      __typename
    }
    handouts {
      nextToken
      __typename
    }
    promotions {
      nextToken
      __typename
    }
    video
    videoCaption
    boothNumber
    visits
    views
    likes
    inquiries {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorsId
    aPSCompanyExhibitorProfilesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppExhibitorProfileSubscriptionVariables,
  APITypes.OnUpdateApsAppExhibitorProfileSubscription
>;
export const onDeleteApsAppExhibitorProfile = /* GraphQL */ `subscription OnDeleteApsAppExhibitorProfile(
  $filter: ModelSubscriptionApsAppExhibitorProfileFilterInput
) {
  onDeleteApsAppExhibitorProfile(filter: $filter) {
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
      address
      city
      state
      zip
      country
      logo
      eventId
      createdAt
      updatedAt
      aPSCompaniesId
      __typename
    }
    sponsorId
    sponsor {
      id
      companyId
      eventId
      createdAt
      updatedAt
      aPSSponsorsId
      aPSCompanySponsorsId
      apsSponsorProfileId
      __typename
    }
    title
    phone
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    deals {
      nextToken
      __typename
    }
    photos {
      nextToken
      __typename
    }
    handouts {
      nextToken
      __typename
    }
    promotions {
      nextToken
      __typename
    }
    video
    videoCaption
    boothNumber
    visits
    views
    likes
    inquiries {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorsId
    aPSCompanyExhibitorProfilesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppExhibitorProfileSubscriptionVariables,
  APITypes.OnDeleteApsAppExhibitorProfileSubscription
>;
export const onCreateApsAppMessage = /* GraphQL */ `subscription OnCreateApsAppMessage(
  $filter: ModelSubscriptionApsAppMessageFilterInput
) {
  onCreateApsAppMessage(filter: $filter) {
    id
    type
    message
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSMessagesId
    apsAppUserMessagesId
    apsAppExhibitorProfileInquiriesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppMessageSubscriptionVariables,
  APITypes.OnCreateApsAppMessageSubscription
>;
export const onUpdateApsAppMessage = /* GraphQL */ `subscription OnUpdateApsAppMessage(
  $filter: ModelSubscriptionApsAppMessageFilterInput
) {
  onUpdateApsAppMessage(filter: $filter) {
    id
    type
    message
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSMessagesId
    apsAppUserMessagesId
    apsAppExhibitorProfileInquiriesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppMessageSubscriptionVariables,
  APITypes.OnUpdateApsAppMessageSubscription
>;
export const onDeleteApsAppMessage = /* GraphQL */ `subscription OnDeleteApsAppMessage(
  $filter: ModelSubscriptionApsAppMessageFilterInput
) {
  onDeleteApsAppMessage(filter: $filter) {
    id
    type
    message
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSMessagesId
    apsAppUserMessagesId
    apsAppExhibitorProfileInquiriesId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppMessageSubscriptionVariables,
  APITypes.OnDeleteApsAppMessageSubscription
>;
export const onCreateApsAppExhibitorPromotion = /* GraphQL */ `subscription OnCreateApsAppExhibitorPromotion(
  $filter: ModelSubscriptionApsAppExhibitorPromotionFilterInput
) {
  onCreateApsAppExhibitorPromotion(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    promotion
    link
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorPromotionsId
    apsAppExhibitorProfilePromotionsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppExhibitorPromotionSubscriptionVariables,
  APITypes.OnCreateApsAppExhibitorPromotionSubscription
>;
export const onUpdateApsAppExhibitorPromotion = /* GraphQL */ `subscription OnUpdateApsAppExhibitorPromotion(
  $filter: ModelSubscriptionApsAppExhibitorPromotionFilterInput
) {
  onUpdateApsAppExhibitorPromotion(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    promotion
    link
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorPromotionsId
    apsAppExhibitorProfilePromotionsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppExhibitorPromotionSubscriptionVariables,
  APITypes.OnUpdateApsAppExhibitorPromotionSubscription
>;
export const onDeleteApsAppExhibitorPromotion = /* GraphQL */ `subscription OnDeleteApsAppExhibitorPromotion(
  $filter: ModelSubscriptionApsAppExhibitorPromotionFilterInput
) {
  onDeleteApsAppExhibitorPromotion(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    promotion
    link
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorPromotionsId
    apsAppExhibitorProfilePromotionsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppExhibitorPromotionSubscriptionVariables,
  APITypes.OnDeleteApsAppExhibitorPromotionSubscription
>;
export const onCreateApsAppExhibitorDeal = /* GraphQL */ `subscription OnCreateApsAppExhibitorDeal(
  $filter: ModelSubscriptionApsAppExhibitorDealFilterInput
) {
  onCreateApsAppExhibitorDeal(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    deal
    link
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorDealsId
    apsAppUserExhibitorDealsId
    apsAppExhibitorProfileDealsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppExhibitorDealSubscriptionVariables,
  APITypes.OnCreateApsAppExhibitorDealSubscription
>;
export const onUpdateApsAppExhibitorDeal = /* GraphQL */ `subscription OnUpdateApsAppExhibitorDeal(
  $filter: ModelSubscriptionApsAppExhibitorDealFilterInput
) {
  onUpdateApsAppExhibitorDeal(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    deal
    link
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorDealsId
    apsAppUserExhibitorDealsId
    apsAppExhibitorProfileDealsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppExhibitorDealSubscriptionVariables,
  APITypes.OnUpdateApsAppExhibitorDealSubscription
>;
export const onDeleteApsAppExhibitorDeal = /* GraphQL */ `subscription OnDeleteApsAppExhibitorDeal(
  $filter: ModelSubscriptionApsAppExhibitorDealFilterInput
) {
  onDeleteApsAppExhibitorDeal(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    deal
    link
    userId
    user {
      id
      registrantId
      qrCode
      createdAt
      updatedAt
      __typename
    }
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorDealsId
    apsAppUserExhibitorDealsId
    apsAppExhibitorProfileDealsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppExhibitorDealSubscriptionVariables,
  APITypes.OnDeleteApsAppExhibitorDealSubscription
>;
export const onCreateApsAppExhibitorPhoto = /* GraphQL */ `subscription OnCreateApsAppExhibitorPhoto(
  $filter: ModelSubscriptionApsAppExhibitorPhotoFilterInput
) {
  onCreateApsAppExhibitorPhoto(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    photo
    caption
    approved
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorPhotosId
    apsAppExhibitorProfilePhotosId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppExhibitorPhotoSubscriptionVariables,
  APITypes.OnCreateApsAppExhibitorPhotoSubscription
>;
export const onUpdateApsAppExhibitorPhoto = /* GraphQL */ `subscription OnUpdateApsAppExhibitorPhoto(
  $filter: ModelSubscriptionApsAppExhibitorPhotoFilterInput
) {
  onUpdateApsAppExhibitorPhoto(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    photo
    caption
    approved
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorPhotosId
    apsAppExhibitorProfilePhotosId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppExhibitorPhotoSubscriptionVariables,
  APITypes.OnUpdateApsAppExhibitorPhotoSubscription
>;
export const onDeleteApsAppExhibitorPhoto = /* GraphQL */ `subscription OnDeleteApsAppExhibitorPhoto(
  $filter: ModelSubscriptionApsAppExhibitorPhotoFilterInput
) {
  onDeleteApsAppExhibitorPhoto(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    photo
    caption
    approved
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorPhotosId
    apsAppExhibitorProfilePhotosId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppExhibitorPhotoSubscriptionVariables,
  APITypes.OnDeleteApsAppExhibitorPhotoSubscription
>;
export const onCreateApsAppExhibitorHandout = /* GraphQL */ `subscription OnCreateApsAppExhibitorHandout(
  $filter: ModelSubscriptionApsAppExhibitorHandoutFilterInput
) {
  onCreateApsAppExhibitorHandout(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    handout
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorHandoutsId
    apsAppExhibitorProfileHandoutsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAppExhibitorHandoutSubscriptionVariables,
  APITypes.OnCreateApsAppExhibitorHandoutSubscription
>;
export const onUpdateApsAppExhibitorHandout = /* GraphQL */ `subscription OnUpdateApsAppExhibitorHandout(
  $filter: ModelSubscriptionApsAppExhibitorHandoutFilterInput
) {
  onUpdateApsAppExhibitorHandout(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    handout
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorHandoutsId
    apsAppExhibitorProfileHandoutsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAppExhibitorHandoutSubscriptionVariables,
  APITypes.OnUpdateApsAppExhibitorHandoutSubscription
>;
export const onDeleteApsAppExhibitorHandout = /* GraphQL */ `subscription OnDeleteApsAppExhibitorHandout(
  $filter: ModelSubscriptionApsAppExhibitorHandoutFilterInput
) {
  onDeleteApsAppExhibitorHandout(filter: $filter) {
    id
    exhibitorId
    exhibitor {
      id
      companyId
      sponsorId
      title
      phone
      eventId
      video
      videoCaption
      boothNumber
      visits
      views
      likes
      createdAt
      updatedAt
      aPSExhibitorsId
      aPSCompanyExhibitorProfilesId
      __typename
    }
    handout
    eventId
    event {
      id
      year
      codes
      createdAt
      updatedAt
      aPSAgendaId
      __typename
    }
    createdAt
    updatedAt
    aPSExhibitorHandoutsId
    apsAppExhibitorProfileHandoutsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAppExhibitorHandoutSubscriptionVariables,
  APITypes.OnDeleteApsAppExhibitorHandoutSubscription
>;
export const onCreateApsAddOn = /* GraphQL */ `subscription OnCreateApsAddOn($filter: ModelSubscriptionApsAddOnFilterInput) {
  onCreateApsAddOn(filter: $filter) {
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
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsAddOnSubscriptionVariables,
  APITypes.OnCreateApsAddOnSubscription
>;
export const onUpdateApsAddOn = /* GraphQL */ `subscription OnUpdateApsAddOn($filter: ModelSubscriptionApsAddOnFilterInput) {
  onUpdateApsAddOn(filter: $filter) {
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
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsAddOnSubscriptionVariables,
  APITypes.OnUpdateApsAddOnSubscription
>;
export const onDeleteApsAddOn = /* GraphQL */ `subscription OnDeleteApsAddOn($filter: ModelSubscriptionApsAddOnFilterInput) {
  onDeleteApsAddOn(filter: $filter) {
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
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsAddOnSubscriptionVariables,
  APITypes.OnDeleteApsAddOnSubscription
>;
export const onCreateApsSeatingChart = /* GraphQL */ `subscription OnCreateApsSeatingChart(
  $filter: ModelSubscriptionApsSeatingChartFilterInput
) {
  onCreateApsSeatingChart(filter: $filter) {
    id
    registrants {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsSeatingChartSubscriptionVariables,
  APITypes.OnCreateApsSeatingChartSubscription
>;
export const onUpdateApsSeatingChart = /* GraphQL */ `subscription OnUpdateApsSeatingChart(
  $filter: ModelSubscriptionApsSeatingChartFilterInput
) {
  onUpdateApsSeatingChart(filter: $filter) {
    id
    registrants {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsSeatingChartSubscriptionVariables,
  APITypes.OnUpdateApsSeatingChartSubscription
>;
export const onDeleteApsSeatingChart = /* GraphQL */ `subscription OnDeleteApsSeatingChart(
  $filter: ModelSubscriptionApsSeatingChartFilterInput
) {
  onDeleteApsSeatingChart(filter: $filter) {
    id
    registrants {
      nextToken
      __typename
    }
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsSeatingChartSubscriptionVariables,
  APITypes.OnDeleteApsSeatingChartSubscription
>;
export const onCreateApsSeatingChartRegistrant = /* GraphQL */ `subscription OnCreateApsSeatingChartRegistrant(
  $filter: ModelSubscriptionApsSeatingChartRegistrantFilterInput
) {
  onCreateApsSeatingChartRegistrant(filter: $filter) {
    id
    category
    firstName
    lastName
    company
    email
    role
    tableNumber
    notes
    seatingChartID
    seatingChart {
      id
      createdAt
      updatedAt
      __typename
    }
    registrantID
    registrant {
      id
      apsID
      firstName
      lastName
      email
      phone
      companyId
      jobTitle
      attendeeType
      termsAccepted
      interests
      otherInterest
      speedNetworking
      speedNetworkingStatus
      billingAddressFirstName
      billingAddressLastName
      billingAddressEmail
      billingAddressPhone
      billingAddressStreet
      billingAddressCity
      billingAddressState
      billingAddressZip
      sameAsAttendee
      speakerTopic
      learningObjectives
      totalAmount
      discountCode
      status
      morrisetteTransportation
      morrisetteStatus
      aristoTransportation
      aristoStatus
      magnaTransportation
      magnaStatus
      paymentConfirmation
      registrationEmailSent
      registrationEmailSentDate
      registrationEmailReceived
      registrationEmailReceivedDate
      welcomeEmailSent
      welcomeEmailSentDate
      welcomeEmailReceived
      welcomeEmailReceivedDate
      paymentMethod
      paymentLast4
      approvedAt
      headshot
      presentation
      presentationTitle
      presentationSummary
      bio
      createdAt
      updatedAt
      aPSRegistrantsId
      aPSCompanyRegistrantsId
      apsRegistrantSeatingChartRegistrantId
      apsRegistrantAppUserId
      __typename
    }
    createdAt
    updatedAt
    apsSeatingChartRegistrantsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateApsSeatingChartRegistrantSubscriptionVariables,
  APITypes.OnCreateApsSeatingChartRegistrantSubscription
>;
export const onUpdateApsSeatingChartRegistrant = /* GraphQL */ `subscription OnUpdateApsSeatingChartRegistrant(
  $filter: ModelSubscriptionApsSeatingChartRegistrantFilterInput
) {
  onUpdateApsSeatingChartRegistrant(filter: $filter) {
    id
    category
    firstName
    lastName
    company
    email
    role
    tableNumber
    notes
    seatingChartID
    seatingChart {
      id
      createdAt
      updatedAt
      __typename
    }
    registrantID
    registrant {
      id
      apsID
      firstName
      lastName
      email
      phone
      companyId
      jobTitle
      attendeeType
      termsAccepted
      interests
      otherInterest
      speedNetworking
      speedNetworkingStatus
      billingAddressFirstName
      billingAddressLastName
      billingAddressEmail
      billingAddressPhone
      billingAddressStreet
      billingAddressCity
      billingAddressState
      billingAddressZip
      sameAsAttendee
      speakerTopic
      learningObjectives
      totalAmount
      discountCode
      status
      morrisetteTransportation
      morrisetteStatus
      aristoTransportation
      aristoStatus
      magnaTransportation
      magnaStatus
      paymentConfirmation
      registrationEmailSent
      registrationEmailSentDate
      registrationEmailReceived
      registrationEmailReceivedDate
      welcomeEmailSent
      welcomeEmailSentDate
      welcomeEmailReceived
      welcomeEmailReceivedDate
      paymentMethod
      paymentLast4
      approvedAt
      headshot
      presentation
      presentationTitle
      presentationSummary
      bio
      createdAt
      updatedAt
      aPSRegistrantsId
      aPSCompanyRegistrantsId
      apsRegistrantSeatingChartRegistrantId
      apsRegistrantAppUserId
      __typename
    }
    createdAt
    updatedAt
    apsSeatingChartRegistrantsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateApsSeatingChartRegistrantSubscriptionVariables,
  APITypes.OnUpdateApsSeatingChartRegistrantSubscription
>;
export const onDeleteApsSeatingChartRegistrant = /* GraphQL */ `subscription OnDeleteApsSeatingChartRegistrant(
  $filter: ModelSubscriptionApsSeatingChartRegistrantFilterInput
) {
  onDeleteApsSeatingChartRegistrant(filter: $filter) {
    id
    category
    firstName
    lastName
    company
    email
    role
    tableNumber
    notes
    seatingChartID
    seatingChart {
      id
      createdAt
      updatedAt
      __typename
    }
    registrantID
    registrant {
      id
      apsID
      firstName
      lastName
      email
      phone
      companyId
      jobTitle
      attendeeType
      termsAccepted
      interests
      otherInterest
      speedNetworking
      speedNetworkingStatus
      billingAddressFirstName
      billingAddressLastName
      billingAddressEmail
      billingAddressPhone
      billingAddressStreet
      billingAddressCity
      billingAddressState
      billingAddressZip
      sameAsAttendee
      speakerTopic
      learningObjectives
      totalAmount
      discountCode
      status
      morrisetteTransportation
      morrisetteStatus
      aristoTransportation
      aristoStatus
      magnaTransportation
      magnaStatus
      paymentConfirmation
      registrationEmailSent
      registrationEmailSentDate
      registrationEmailReceived
      registrationEmailReceivedDate
      welcomeEmailSent
      welcomeEmailSentDate
      welcomeEmailReceived
      welcomeEmailReceivedDate
      paymentMethod
      paymentLast4
      approvedAt
      headshot
      presentation
      presentationTitle
      presentationSummary
      bio
      createdAt
      updatedAt
      aPSRegistrantsId
      aPSCompanyRegistrantsId
      apsRegistrantSeatingChartRegistrantId
      apsRegistrantAppUserId
      __typename
    }
    createdAt
    updatedAt
    apsSeatingChartRegistrantsId
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteApsSeatingChartRegistrantSubscriptionVariables,
  APITypes.OnDeleteApsSeatingChartRegistrantSubscription
>;
